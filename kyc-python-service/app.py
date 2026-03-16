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


_reader = None
_reader_lock = Lock()


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


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


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
