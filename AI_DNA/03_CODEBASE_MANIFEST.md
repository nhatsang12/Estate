# 03. CODEBASE MANIFEST

This manifest highlights the active "DNA" files and their system responsibilities.

---

## 1. Entry Point: API Server
**Path:** `backend/server.js`  
**Purpose:** Boots Express, security middleware, Swagger docs, route mounting, and global error handling.  
**Dependencies:** express, dotenv, helmet, cors, rate-limit, swagger, route modules.

**Logic Summary:**  
Load environment -> apply security + parsers -> mount `/api/auth`, `/api/users`, `/api/properties`, `/api/admin` -> expose `/api-docs` -> centralized error handling.

---

## 2. Dedicated KYC OCR Microservice
**Path:** `kyc-python-service/app.py`  
**Purpose:** Runs the OCR pipeline for CCCD using image preprocessing + text extraction.  
**Dependencies:** fastapi, uvicorn, opencv-python, easyocr, pillow, numpy.

**Logic Summary:**  
Accept image payload (multipart or base64) -> OpenCV preprocessing (auto-crop/perspective correction, deskew, enhancement) -> EasyOCR (`vi`, `en`) -> parse key fields (name, ID, DOB, permanent address) -> return structured JSON with confidence.

---

## 3. KYC Bridge in Node Backend
**Path:** `backend/utils/kycService.js`  
**Purpose:** Connects backend KYC flow to the Python microservice and computes final decision inputs.  
**Dependencies:** built-in `fetch`, environment variable `KYC_PYTHON_SERVICE_URL` (default: `http://localhost:8001/process`).

**Logic Summary:**  
Convert image buffer to base64 -> POST to Python `/process` -> normalize OCR payload -> merge front/back extraction -> compare with profile/declarations -> produce definitive automated outcome (`verified` or `rejected` only).

---

## 4. Core Model: User Schema
**Path:** `backend/models/User.js`  
**Purpose:** Stores account, auth, quota, and KYC lifecycle data.  
**Dependencies:** mongoose, bcryptjs, crypto.

**KYC Fields (critical):**
- `kycStatus` (`pending | submitted | reviewing | verified | rejected`)
- `kycDocuments` (Cloudinary URLs)
- `kycExtractedData` (raw + parsed OCR data)
- `kycComparisonResult` (match/mismatch + scores)
- `kycRejectionReason` (auto/admin rejection notes)

---

## 5. KYC Submission Controller
**Path:** `backend/controllers/userController.js` (`submitKycDocuments`)  
**Purpose:** Handles KYC submission end-to-end for `user` and `provider`.

**Logic Summary:**  
Validate uploads -> upload CCCD images to Cloudinary -> set `submitted` -> call Python OCR service for front/back -> persist extracted/comparison payloads -> enforce definitive auto decision (`verified` or `rejected`).

---

## 6. KYC Route Surface
**Path:** `backend/routes/userRoutes.js`  
**Endpoint:** `PATCH /api/users/kyc/submit`  
**Purpose:** Protected route for CCCD upload with Swagger documentation.

---

## 7. Admin Override
**Path:** `backend/controllers/adminController.js` (`verifyProvider`)  
**Purpose:** Allows admin to synchronize `isVerified` with `kycStatus` and maintain `kycRejectionReason` consistency on manual moderation.
