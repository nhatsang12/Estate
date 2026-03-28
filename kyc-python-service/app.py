import base64
import os
import re
import time
import unicodedata
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

import cv2
import easyocr
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse


app = FastAPI(
    title="EstateManager KYC Python Service",
    version="1.0.0",
    description="OpenCV + EasyOCR microservice for CCCD extraction",
)


MAX_IMAGE_BYTES = int(os.getenv("KYC_MAX_IMAGE_BYTES", "12000000"))
CARD_MIN_AREA_RATIO = float(os.getenv("KYC_CARD_MIN_AREA_RATIO", "0.12"))
DESKEW_MAX_ANGLE = float(os.getenv("KYC_DESKEW_MAX_ANGLE", "15"))
PRELOAD_OCR_MODEL = os.getenv("KYC_PRELOAD_MODEL", "true").lower() == "true"
USE_GPU = os.getenv("KYC_EASYOCR_GPU", "false").lower() == "true"
PRIMARY_OCR_ACCEPT_CONFIDENCE = float(os.getenv("KYC_PRIMARY_OCR_ACCEPT_CONFIDENCE", "0.55"))
FACE_MATCH_THRESHOLD = float(os.getenv("KYC_FACE_MATCH_THRESHOLD", "0.45"))
FACE_MIN_SIZE_RATIO = float(os.getenv("KYC_FACE_MIN_SIZE_RATIO", "0.12"))
FACE_ALIGN_TARGET_SIZE = int(os.getenv("KYC_FACE_ALIGN_TARGET_SIZE", "160"))
FACE_HIST_BINS = int(os.getenv("KYC_FACE_HIST_BINS", "32"))


_reader = None
_reader_lock = Lock()
_face_detector = None
_eye_detector = None
_detector_lock = Lock()


def strip_vietnamese_tones(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return normalized.replace("đ", "d").replace("Đ", "D")


def normalize_search(value: str) -> str:
    value = strip_vietnamese_tones(value).lower()
    value = re.sub(r"[^a-z0-9\s:/-]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def normalize_compare_text(value: str) -> str:
    value = strip_vietnamese_tones(value or "").lower()
    return re.sub(r"[^a-z0-9]", "", value)


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        with _reader_lock:
            if _reader is None:
                _reader = easyocr.Reader(["vi", "en"], gpu=USE_GPU)
    return _reader


@app.on_event("startup")
def preload_reader_on_startup() -> None:
    if PRELOAD_OCR_MODEL:
        get_reader()


def decode_base64_image(image_base64: str) -> bytes:
    if not image_base64:
        raise ValueError("image_base64 is required")

    if "," in image_base64 and "base64" in image_base64.split(",", 1)[0]:
        image_base64 = image_base64.split(",", 1)[1]

    try:
        return base64.b64decode(image_base64, validate=True)
    except Exception as err:
        raise ValueError("Invalid base64 image payload") from err


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("Image payload is empty")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"Image payload exceeds {MAX_IMAGE_BYTES} bytes")

    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to decode image bytes")

    return image


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = points.sum(axis=1)
    rect[0] = points[np.argmin(s)]  # top-left
    rect[2] = points[np.argmax(s)]  # bottom-right

    diff = np.diff(points, axis=1)
    rect[1] = points[np.argmin(diff)]  # top-right
    rect[3] = points[np.argmax(diff)]  # bottom-left
    return rect


def four_point_transform(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    rect = order_points(points)
    (tl, tr, br, bl) = rect

    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = int(max(width_a, width_b))

    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = int(max(height_a, height_b))

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )

    transform_matrix = cv2.getPerspectiveTransform(rect, destination)
    warped = cv2.warpPerspective(image, transform_matrix, (max_width, max_height))
    return warped


def auto_crop_and_rectify(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 75, 200)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

    image_area = image.shape[0] * image.shape[1]
    min_card_area = image_area * CARD_MIN_AREA_RATIO

    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        area = cv2.contourArea(contour)

        if len(approx) == 4 and area >= min_card_area:
            points = approx.reshape(4, 2).astype("float32")
            warped = four_point_transform(image, points)
            return warped, True

    return image, False


def deskew_image(image: np.ndarray) -> Tuple[np.ndarray, float]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    thresholded = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    coordinates = np.column_stack(np.where(thresholded > 0))

    if len(coordinates) < 50:
        return image, 0.0

    angle = cv2.minAreaRect(coordinates)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) > DESKEW_MAX_ANGLE:
        return image, 0.0

    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image, matrix, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    return rotated, float(angle)


def enhance_image_for_ocr(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)
    denoised = cv2.fastNlMeansDenoising(contrast, None, 18, 7, 21)
    binary = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    return cleaned


def extract_date(text: str) -> str:
    match = re.search(r"([0-3]?\d[\/.\-][01]?\d[\/.\-](?:\d{2}|\d{4}))", text or "")
    if not match:
        return ""
    return match.group(1).replace(".", "/").replace("-", "/")


def extract_labeled_value(
    lines: List[Dict[str, Any]], labels: List[str]
) -> Tuple[str, float]:
    normalized_labels = [normalize_search(label) for label in labels]

    for idx, line_obj in enumerate(lines):
        text = line_obj["text"]
        normalized_line = normalize_search(text)
        matched = any(label in normalized_line for label in normalized_labels)
        if not matched:
            continue

        if ":" in text:
            inline = text.split(":", 1)[1].strip()
            if inline:
                return inline, float(line_obj["confidence"])

        if "-" in text:
            inline = text.split("-", 1)[1].strip()
            if inline:
                return inline, float(line_obj["confidence"])

        for jump in (1, 2):
            next_idx = idx + jump
            if next_idx >= len(lines):
                break
            candidate = lines[next_idx]["text"].strip()
            if not candidate:
                continue
            if len(candidate) < 3:
                continue
            return candidate, float(lines[next_idx]["confidence"])

    return "", 0.0


def find_confidence_for_value(lines: List[Dict[str, Any]], value: str) -> float:
    normalized_value = normalize_compare_text(value)
    if not normalized_value:
        return 0.0

    best = 0.0
    for line_obj in lines:
        normalized_line = normalize_compare_text(line_obj["text"])
        if normalized_value in normalized_line or normalized_line in normalized_value:
            best = max(best, float(line_obj["confidence"]))
    return best


def parse_ocr_lines(lines: List[Dict[str, Any]]) -> Tuple[Dict[str, str], Dict[str, float]]:
    raw_text = "\n".join(line["text"] for line in lines)
    id_candidates = re.findall(r"\b\d{9,12}\b", raw_text)

    for line_obj in lines:
        digits = normalize_digits(line_obj["text"])
        if 9 <= len(digits) <= 12:
            id_candidates.append(digits)

    id_candidates = sorted(
        set(normalize_digits(value) for value in id_candidates if normalize_digits(value)),
        key=lambda item: len(item),
        reverse=True,
    )

    full_name, full_name_conf = extract_labeled_value(
        lines, ["ho va ten", "họ và tên", "full name", "name"]
    )
    dob_candidate, dob_conf = extract_labeled_value(lines, ["ngay sinh", "ngày sinh", "date of birth"])
    address, address_conf = extract_labeled_value(
        lines,
        ["noi thuong tru", "nơi thường trú", "permanent address", "dia chi thuong tru", "thuong tru"],
    )
    place_of_origin, place_origin_conf = extract_labeled_value(
        lines,
        ["que quan", "quê quán", "place of origin"],
    )

    id_number = id_candidates[0] if id_candidates else ""
    id_conf = find_confidence_for_value(lines, id_number)
    date_of_birth = extract_date(dob_candidate) or extract_date(raw_text)
    if not dob_conf and date_of_birth:
        dob_conf = find_confidence_for_value(lines, date_of_birth)

    extracted = {
        "fullName": full_name or "",
        "idNumber": id_number or "",
        "dateOfBirth": date_of_birth or "",
        "permanentAddress": address or "",
        "placeOfOrigin": place_of_origin or "",
    }

    field_confidences = {
        "fullName": round(clamp(full_name_conf, 0.0, 1.0), 4),
        "idNumber": round(clamp(id_conf, 0.0, 1.0), 4),
        "dateOfBirth": round(clamp(dob_conf, 0.0, 1.0), 4),
        "permanentAddress": round(clamp(address_conf, 0.0, 1.0), 4),
        "placeOfOrigin": round(clamp(place_origin_conf, 0.0, 1.0), 4),
    }

    return extracted, field_confidences


def run_easyocr_with_best_image(
    deskewed_image: np.ndarray, enhanced_image: np.ndarray
) -> Tuple[List[Tuple[Any, str, float]], str]:
    reader = get_reader()
    enhanced_result = reader.readtext(enhanced_image, detail=1, paragraph=False)

    def avg_confidence(result: List[Tuple[Any, str, float]]) -> float:
        if not result:
            return 0.0
        confidences = [float(item[2]) for item in result]
        return sum(confidences) / len(confidences)

    enhanced_conf = avg_confidence(enhanced_result)
    if enhanced_result and enhanced_conf >= PRIMARY_OCR_ACCEPT_CONFIDENCE:
        return enhanced_result, "enhanced"

    # Fallback OCR pass only when the first pass is weak/empty.
    deskewed_result = reader.readtext(deskewed_image, detail=1, paragraph=False)
    deskewed_conf = avg_confidence(deskewed_result)

    if deskewed_conf > enhanced_conf:
        return deskewed_result, "deskewed"
    return enhanced_result, "enhanced"


def map_easyocr_result(ocr_result: List[Tuple[Any, str, float]]) -> List[Dict[str, Any]]:
    mapped: List[Dict[str, Any]] = []
    for item in ocr_result:
        if len(item) < 3:
            continue
        text = str(item[1]).strip()
        if not text:
            continue
        confidence = float(item[2])
        mapped.append(
            {
                "text": text,
                "confidence": round(clamp(confidence, 0.0, 1.0), 4),
            }
        )
    return mapped


def get_face_detector() -> cv2.CascadeClassifier:
    global _face_detector
    if _face_detector is None:
        with _detector_lock:
            if _face_detector is None:
                detector = cv2.CascadeClassifier(
                    os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
                )
                if detector.empty():
                    raise RuntimeError("Unable to load Haar cascade for face detection")
                _face_detector = detector
    return _face_detector


def get_eye_detector() -> cv2.CascadeClassifier:
    global _eye_detector
    if _eye_detector is None:
        with _detector_lock:
            if _eye_detector is None:
                for cascade_name in (
                    "haarcascade_eye_tree_eyeglasses.xml",
                    "haarcascade_eye.xml",
                ):
                    detector = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, cascade_name))
                    if not detector.empty():
                        _eye_detector = detector
                        break
                if _eye_detector is None:
                    raise RuntimeError("Unable to load Haar cascade for eye detection")
    return _eye_detector


def detect_largest_face_bbox(
    image: np.ndarray,
    min_size_ratio: float = FACE_MIN_SIZE_RATIO,
    min_neighbors: int = 4,
) -> Optional[Tuple[int, int, int, int]]:
    detector = get_face_detector()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    height, width = gray.shape[:2]
    base_min = max(24, int(min(height, width) * min_size_ratio))

    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=min_neighbors,
        minSize=(base_min, base_min),
    )
    if len(faces) == 0:
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.08,
            minNeighbors=max(3, min_neighbors - 1),
            minSize=(max(20, int(base_min * 0.7)), max(20, int(base_min * 0.7))),
        )
    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda box: int(box[2]) * int(box[3]))
    return int(x), int(y), int(w), int(h)


def safe_crop(image: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    height, width = image.shape[:2]
    x0 = max(0, min(x, width - 1))
    y0 = max(0, min(y, height - 1))
    x1 = max(x0 + 1, min(x + w, width))
    y1 = max(y0 + 1, min(y + h, height))
    return image[y0:y1, x0:x1]


def expand_bbox(
    bbox: Tuple[int, int, int, int], image_shape: Tuple[int, int, int], margin_ratio: float = 0.20
) -> Tuple[int, int, int, int]:
    x, y, w, h = bbox
    height, width = image_shape[:2]
    margin_w = int(w * margin_ratio)
    margin_h = int(h * margin_ratio)
    expanded_x = max(0, x - margin_w)
    expanded_y = max(0, y - margin_h)
    expanded_w = min(width - expanded_x, w + (2 * margin_w))
    expanded_h = min(height - expanded_y, h + (2 * margin_h))
    return expanded_x, expanded_y, max(1, expanded_w), max(1, expanded_h)


def fallback_selfie_bbox(image: np.ndarray) -> Tuple[int, int, int, int]:
    height, width = image.shape[:2]
    side = int(min(height, width) * 0.72)
    x = max(0, (width - side) // 2)
    y = max(0, (height - side) // 2)
    return x, y, max(1, side), max(1, side)


def fallback_cccd_bbox(image: np.ndarray) -> Tuple[int, int, int, int]:
    height, width = image.shape[:2]
    if width >= height:
        # CCCD front commonly places portrait on left area.
        fallback_x = int(width * 0.02)
        fallback_y = int(height * 0.12)
        fallback_w = int(width * 0.44)
        fallback_h = int(height * 0.76)
    else:
        fallback_x = 0
        fallback_y = int(height * 0.08)
        fallback_w = int(width * 0.52)
        fallback_h = int(height * 0.58)

    return fallback_x, fallback_y, max(1, fallback_w), max(1, fallback_h)


def detect_eye_centers(face_image: np.ndarray) -> List[Tuple[float, float]]:
    detector = get_eye_detector()
    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    height, width = gray.shape[:2]
    min_size = max(12, int(min(height, width) * 0.10))

    eyes = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(min_size, min_size),
    )
    if len(eyes) < 2:
        eyes = detector.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=2,
            minSize=(max(10, int(min_size * 0.8)), max(10, int(min_size * 0.8))),
        )
    if len(eyes) < 2:
        return []

    # Keep candidates from upper half, then choose the farthest horizontal pair.
    candidates: List[Tuple[int, int, int, int]] = []
    for eye in eyes:
        ex, ey, ew, eh = [int(value) for value in eye]
        center_y = ey + (eh / 2.0)
        if center_y <= (height * 0.75):
            candidates.append((ex, ey, ew, eh))
    if len(candidates) < 2:
        candidates = [(int(ex), int(ey), int(ew), int(eh)) for ex, ey, ew, eh in eyes]
    if len(candidates) < 2:
        return []

    best_pair: Optional[Tuple[Tuple[int, int, int, int], Tuple[int, int, int, int]]] = None
    best_distance = -1.0

    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            a = candidates[i]
            b = candidates[j]
            a_center = (a[0] + a[2] / 2.0, a[1] + a[3] / 2.0)
            b_center = (b[0] + b[2] / 2.0, b[1] + b[3] / 2.0)
            horizontal_distance = abs(a_center[0] - b_center[0])
            if horizontal_distance > best_distance:
                best_distance = horizontal_distance
                best_pair = (a, b)

    if best_pair is None:
        return []

    first, second = best_pair
    first_center = (first[0] + first[2] / 2.0, first[1] + first[3] / 2.0)
    second_center = (second[0] + second[2] / 2.0, second[1] + second[3] / 2.0)
    left_eye, right_eye = (
        (first_center, second_center)
        if first_center[0] <= second_center[0]
        else (second_center, first_center)
    )
    return [left_eye, right_eye]


def transform_bbox(
    bbox: Tuple[int, int, int, int], matrix: np.ndarray, image_shape: Tuple[int, int, int]
) -> Tuple[int, int, int, int]:
    x, y, w, h = bbox
    points = np.array(
        [
            [[x, y]],
            [[x + w, y]],
            [[x + w, y + h]],
            [[x, y + h]],
        ],
        dtype=np.float32,
    )
    transformed = cv2.transform(points, matrix).reshape(-1, 2)
    min_x = max(0, int(np.floor(np.min(transformed[:, 0]))))
    min_y = max(0, int(np.floor(np.min(transformed[:, 1]))))
    max_x = min(image_shape[1], int(np.ceil(np.max(transformed[:, 0]))))
    max_y = min(image_shape[0], int(np.ceil(np.max(transformed[:, 1]))))
    return min_x, min_y, max(1, max_x - min_x), max(1, max_y - min_y)


def align_face_image(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    target_size: int = FACE_ALIGN_TARGET_SIZE,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    expanded_bbox = expand_bbox(bbox, image.shape, margin_ratio=0.18)
    face_region = safe_crop(image, *expanded_bbox)
    eye_centers_local = detect_eye_centers(face_region)
    aligned_bbox = expanded_bbox
    rotation_angle = 0.0
    eye_alignment_used = False
    rotated_image = image

    if len(eye_centers_local) == 2:
        (left_eye_local, right_eye_local) = eye_centers_local
        left_eye_global = (
            expanded_bbox[0] + left_eye_local[0],
            expanded_bbox[1] + left_eye_local[1],
        )
        right_eye_global = (
            expanded_bbox[0] + right_eye_local[0],
            expanded_bbox[1] + right_eye_local[1],
        )
        dy = float(right_eye_global[1] - left_eye_global[1])
        dx = float(right_eye_global[0] - left_eye_global[0])
        if abs(dx) > 1e-3:
            rotation_angle = float(np.degrees(np.arctan2(dy, dx)))
            rotation_center = (
                (left_eye_global[0] + right_eye_global[0]) / 2.0,
                (left_eye_global[1] + right_eye_global[1]) / 2.0,
            )
            rotation_matrix = cv2.getRotationMatrix2D(rotation_center, rotation_angle, 1.0)
            rotated_image = cv2.warpAffine(
                image,
                rotation_matrix,
                (image.shape[1], image.shape[0]),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE,
            )
            aligned_bbox = transform_bbox(expanded_bbox, rotation_matrix, image.shape)
            eye_alignment_used = True

    aligned_face = safe_crop(rotated_image, *aligned_bbox)
    if aligned_face.size == 0:
        aligned_face = safe_crop(image, *expanded_bbox)

    aligned_face = cv2.resize(
        aligned_face, (target_size, target_size), interpolation=cv2.INTER_AREA
    )
    return aligned_face, {
        "eye_alignment_used": bool(eye_alignment_used),
        "eye_count": int(len(eye_centers_local)),
        "rotation_angle_deg": round(float(rotation_angle), 3),
        "input_bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],
        "expanded_bbox": [
            int(expanded_bbox[0]),
            int(expanded_bbox[1]),
            int(expanded_bbox[2]),
            int(expanded_bbox[3]),
        ],
        "aligned_bbox": [
            int(aligned_bbox[0]),
            int(aligned_bbox[1]),
            int(aligned_bbox[2]),
            int(aligned_bbox[3]),
        ],
    }


def preprocess_face_for_compare(face_image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (128, 128), interpolation=cv2.INTER_AREA)
    equalized = cv2.equalizeHist(resized)
    return cv2.GaussianBlur(equalized, (3, 3), 0)


def cosine_similarity(image_a: np.ndarray, image_b: np.ndarray) -> float:
    vec_a = image_a.astype(np.float32).flatten()
    vec_b = image_b.astype(np.float32).flatten()
    norm_a = float(np.linalg.norm(vec_a))
    norm_b = float(np.linalg.norm(vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    cosine = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
    return clamp((cosine + 1.0) / 2.0, 0.0, 1.0)


def histogram_similarity(image_a: np.ndarray, image_b: np.ndarray) -> float:
    hist_a = cv2.calcHist([image_a], [0], None, [64], [0, 256])
    hist_b = cv2.calcHist([image_b], [0], None, [64], [0, 256])
    cv2.normalize(hist_a, hist_a)
    cv2.normalize(hist_b, hist_b)
    corr = float(cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL))
    return clamp((corr + 1.0) / 2.0, 0.0, 1.0)


def orb_similarity(image_a: np.ndarray, image_b: np.ndarray) -> float:
    orb = cv2.ORB_create(nfeatures=300)
    kp_a, des_a = orb.detectAndCompute(image_a, None)
    kp_b, des_b = orb.detectAndCompute(image_b, None)
    if des_a is None or des_b is None or not kp_a or not kp_b:
        return 0.0

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = matcher.knnMatch(des_a, des_b, k=2)
    good_matches = 0
    for pair in matches:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.distance < 0.75 * n.distance:
            good_matches += 1

    denominator = max(len(kp_a), len(kp_b), 1)
    return clamp(good_matches / denominator, 0.0, 1.0)


def face_embedding(face_image: np.ndarray) -> Optional[np.ndarray]:
    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.resize(
        gray, (FACE_ALIGN_TARGET_SIZE, FACE_ALIGN_TARGET_SIZE), interpolation=cv2.INTER_AREA
    )
    normalized = cv2.equalizeHist(normalized)

    win_size = (FACE_ALIGN_TARGET_SIZE, FACE_ALIGN_TARGET_SIZE)
    block_size = (32, 32)
    block_stride = (16, 16)
    cell_size = (16, 16)
    hog = cv2.HOGDescriptor(
        _winSize=win_size,
        _blockSize=block_size,
        _blockStride=block_stride,
        _cellSize=cell_size,
        _nbins=9,
    )
    descriptor = hog.compute(normalized)
    if descriptor is None:
        return None

    hist = cv2.calcHist([normalized], [0], None, [FACE_HIST_BINS], [0, 256]).flatten()
    hist_norm = np.linalg.norm(hist)
    if hist_norm > 0:
        hist = hist / hist_norm

    embedding = np.concatenate([descriptor.flatten().astype(np.float32), hist.astype(np.float32)])
    norm = float(np.linalg.norm(embedding))
    if norm <= 1e-8:
        return None
    return embedding / norm


def embedding_cosine_similarity(embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
    if embedding_a.shape != embedding_b.shape:
        return 0.0
    cosine = float(np.dot(embedding_a, embedding_b))
    return clamp((cosine + 1.0) / 2.0, 0.0, 1.0)


def embedding_distance_similarity(embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
    if embedding_a.shape != embedding_b.shape:
        return 0.0
    distance = float(np.linalg.norm(embedding_a - embedding_b))
    # For two L2-normalized vectors, Euclidean distance is in [0, 2].
    return clamp(1.0 - (distance / 2.0), 0.0, 1.0)


def detect_or_fallback_bbox(image: np.ndarray, is_cccd_face: bool) -> Tuple[Tuple[int, int, int, int], bool, bool]:
    if is_cccd_face:
        detected_bbox = detect_largest_face_bbox(image, min_size_ratio=0.08, min_neighbors=3)
        if detected_bbox is not None:
            return detected_bbox, True, False
        return fallback_cccd_bbox(image), False, True
    detected_bbox = detect_largest_face_bbox(image)
    if detected_bbox is not None:
        return detected_bbox, True, False
    return fallback_selfie_bbox(image), False, True


def compare_face_images(cccd_front_image: np.ndarray, portrait_image: np.ndarray) -> Dict[str, Any]:
    # Detect -> Align -> Embed -> Compare.
    # Selfie previews are often mirrored; flip horizontally before matching with CCCD.
    mirrored_portrait = cv2.flip(portrait_image, 1)
    portrait_bbox, selfie_face_detected, portrait_fallback_used = detect_or_fallback_bbox(
        mirrored_portrait, is_cccd_face=False
    )
    cccd_bbox, cccd_face_detected, cccd_fallback_used = detect_or_fallback_bbox(
        cccd_front_image, is_cccd_face=True
    )

    portrait_face_aligned, portrait_alignment = align_face_image(mirrored_portrait, portrait_bbox)
    cccd_face_aligned, cccd_alignment = align_face_image(cccd_front_image, cccd_bbox)

    portrait_embedding = face_embedding(portrait_face_aligned)
    cccd_embedding = face_embedding(cccd_face_aligned)
    has_embeddings = portrait_embedding is not None and cccd_embedding is not None

    embedding_cosine_score = (
        embedding_cosine_similarity(portrait_embedding, cccd_embedding) if has_embeddings else 0.0
    )
    embedding_distance_score = (
        embedding_distance_similarity(portrait_embedding, cccd_embedding) if has_embeddings else 0.0
    )

    # Secondary signals to stabilize score under lighting/compression noise.
    portrait_ready = preprocess_face_for_compare(portrait_face_aligned)
    cccd_ready = preprocess_face_for_compare(cccd_face_aligned)
    histogram_score = histogram_similarity(portrait_ready, cccd_ready)
    orb_score = orb_similarity(portrait_ready, cccd_ready)
    cosine_pixel_score = cosine_similarity(portrait_ready, cccd_ready)

    if has_embeddings:
        score = clamp(
            (0.62 * embedding_cosine_score)
            + (0.23 * embedding_distance_score)
            + (0.10 * histogram_score)
            + (0.05 * orb_score),
            0.0,
            1.0,
        )
    else:
        # Keep legacy fallback if embedding generation fails unexpectedly.
        score = clamp(
            (0.45 * cosine_pixel_score) + (0.25 * histogram_score) + (0.30 * orb_score),
            0.0,
            1.0,
        )

    threshold = clamp(FACE_MATCH_THRESHOLD, 0.0, 1.0)
    match = bool(score >= threshold)

    if match:
        reason = "Face matched"
    elif not selfie_face_detected:
        reason = "No face detected in portrait image"
    elif not cccd_face_detected:
        reason = "No face detected on CCCD front image"
    else:
        reason = "Face mismatch"

    return {
        "score": round(float(score), 4),
        "threshold": round(float(threshold), 4),
        "match": match,
        "reason": reason,
        "selfie_face_detected": bool(selfie_face_detected),
        "cccd_face_detected": bool(cccd_face_detected),
        "components": {
            "embedding_cosine": round(float(embedding_cosine_score), 4),
            "embedding_distance": round(float(embedding_distance_score), 4),
            "cosine": round(float(cosine_pixel_score), 4),
            "histogram": round(float(histogram_score), 4),
            "orb": round(float(orb_score), 4),
        },
        "processing_meta": {
            "pipeline": ["detect", "align", "embed", "compare"],
            "portrait_mirrored": True,
            "embedding_available": bool(has_embeddings),
            "portrait_fallback_used": bool(portrait_fallback_used),
            "cccd_fallback_used": bool(cccd_fallback_used),
            "portrait_bbox": [int(portrait_bbox[0]), int(portrait_bbox[1]), int(portrait_bbox[2]), int(portrait_bbox[3])],
            "cccd_bbox": [int(cccd_bbox[0]), int(cccd_bbox[1]), int(cccd_bbox[2]), int(cccd_bbox[3])],
            "portrait_alignment": portrait_alignment,
            "cccd_alignment": cccd_alignment,
            "portrait_shape": [int(portrait_face_aligned.shape[1]), int(portrait_face_aligned.shape[0])],
            "cccd_face_shape": [int(cccd_face_aligned.shape[1]), int(cccd_face_aligned.shape[0])],
        },
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/compare-face")
async def compare_face(
    request: Request,
    portrait: Optional[UploadFile] = File(default=None),
    cccd_front: Optional[UploadFile] = File(default=None),
    portrait_base64: Optional[str] = Form(default=None),
    cccd_front_base64: Optional[str] = Form(default=None),
) -> JSONResponse:
    start_time = time.perf_counter()
    try:
        portrait_bytes: Optional[bytes] = None
        cccd_front_bytes: Optional[bytes] = None

        if portrait is not None:
            portrait_bytes = await portrait.read()
        if cccd_front is not None:
            cccd_front_bytes = await cccd_front.read()

        if portrait_bytes is None or cccd_front_bytes is None:
            payload: Dict[str, Any] = {}
            if portrait_base64 is None or cccd_front_base64 is None:
                try:
                    payload = await request.json()
                except Exception:
                    payload = {}

            portrait_raw = portrait_base64 or payload.get("portrait_base64")
            cccd_raw = cccd_front_base64 or payload.get("cccd_front_base64")
            portrait_bytes = decode_base64_image(portrait_raw or "")
            cccd_front_bytes = decode_base64_image(cccd_raw or "")

        portrait_image = decode_image_bytes(portrait_bytes)
        cccd_front_image = decode_image_bytes(cccd_front_bytes)
        face_result = compare_face_images(cccd_front_image, portrait_image)
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        response_data = {
            **face_result,
            "processing_meta": {
                **face_result.get("processing_meta", {}),
                "processing_time_ms": elapsed_ms,
            },
        }

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": response_data,
            },
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Face comparison failed: {err}") from err


@app.post("/process")
async def process_image(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    image_base64: Optional[str] = Form(default=None),
    side_label: Optional[str] = Form(default=None),
) -> JSONResponse:
    start_time = time.perf_counter()

    try:
        image_bytes: Optional[bytes] = None
        payload_side_label = side_label or "unknown"

        if file is not None:
            image_bytes = await file.read()
            payload_side_label = payload_side_label or file.filename or "unknown"
        else:
            if image_base64 is None:
                try:
                    payload = await request.json()
                except Exception:
                    payload = {}
                image_base64 = payload.get("image_base64")
                payload_side_label = payload.get("side_label", payload_side_label)

            image_bytes = decode_base64_image(image_base64 or "")

        image = decode_image_bytes(image_bytes)
        cropped, card_detected = auto_crop_and_rectify(image)
        deskewed, deskew_angle = deskew_image(cropped)
        enhanced = enhance_image_for_ocr(deskewed)

        ocr_result, image_used = run_easyocr_with_best_image(deskewed, enhanced)
        mapped_lines = map_easyocr_result(ocr_result)
        raw_text = "\n".join(line["text"] for line in mapped_lines)
        extracted_data, field_confidences = parse_ocr_lines(mapped_lines)

        avg_confidence = (
            sum(float(line["confidence"]) for line in mapped_lines) / len(mapped_lines)
            if mapped_lines
            else 0.0
        )

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "side_label": payload_side_label,
                "confidence_score": round(clamp(avg_confidence, 0.0, 1.0), 4),
                "raw_text": raw_text,
                "extracted_data": extracted_data,
                "field_confidences": field_confidences,
                "processing_meta": {
                    "card_detected": card_detected,
                    "deskew_angle": round(float(deskew_angle), 3),
                    "image_used_for_ocr": image_used,
                    "line_count": len(mapped_lines),
                    "processing_time_ms": elapsed_ms,
                },
            },
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"KYC processing failed: {err}") from err


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
