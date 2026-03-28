  `# KYC Python Service

FastAPI microservice for CCCD processing using OpenCV preprocessing and EasyOCR extraction.

Recommended runtime: Python 3.11 (or run via Dockerfile included in this folder).

## 1. Setup (venv)

```bash
cd kyc-python-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Run

```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

### Docker (optional)

```bash
docker build -t estate-kyc-service .
docker run --rm -p 8001:8001 estate-kyc-service
```

## 3. Endpoint

- `POST /process`
  - Accepts either:
    - `multipart/form-data` with `file` and optional `side_label`
    - JSON body with `image_base64` and optional `side_label`
  - Response:
    - `extracted_data`: parsed CCCD fields
    - `confidence_score`: overall OCR confidence (0..1)
    - `field_confidences`: confidence by field
    - `raw_text`: OCR text

- `POST /compare-face`
  - Accepts either:
    - `multipart/form-data` with `portrait` + `cccd_front`
    - JSON body with `portrait_base64` + `cccd_front_base64`
  - Response:
    - `score`: face similarity score (0..1)
    - `threshold`: match threshold
    - `match`: boolean result
    - `components`: detailed similarity components

## 4. Health Check

- `GET /health`
