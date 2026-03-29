# EstateManager

EstateManager is a full-stack real estate platform for **property sale workflows**, including listing management, moderation, realtime messaging, AI chatbot (RAG), subscription payments, and KYC verification.

## 1. Project Structure

- `frontend/`: Next.js + TypeScript + Tailwind UI
- `backend/`: Node.js + Express + MongoDB API
- `kyc-python-service/`: FastAPI microservice for OCR + face comparison
- `PROJECT_SUMMARY.md`: High-level implementation summary
- `USER_GUIDE.md`: End-user usage guide

## 2. Core Features

- Role-based system: `user`, `provider`, `admin`
- Property lifecycle: create, edit, moderate, hide/show, mark sold
- Provider dashboard: listing quota, plan management, sales stats
- Admin dashboard: moderation, subscription analytics, KYC governance
- Realtime messaging (Socket.IO) with AI assistant thread
- Chatbot RAG: structured filters + Atlas Search + Vector Search + memory in MongoDB
- Payment gateways: VNPay + PayPal
- KYC automation: OCR + face matching (Detect -> Align -> Embed -> Compare)
- Localization: Vietnamese/English

## 3. Tech Stack

### Frontend
- Next.js 16.x
- React 19 + TypeScript
- Tailwind CSS
- i18next / react-i18next
- Leaflet
- socket.io-client

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT auth + RBAC
- Joi validation
- Multer + Cloudinary
- Socket.IO
- Swagger (OpenAPI)

### KYC Service
- FastAPI
- OpenCV + EasyOCR
- NumPy

## 4. Prerequisites

- Node.js 20+ and npm
- Python 3.10+ (recommended 3.11)
- MongoDB (Atlas/local)
- Cloudinary account
- Google Gemini API key (for chatbot + embeddings)
- VNPay/PayPal credentials (for payment flow)

## 5. Environment Variables

### Frontend (`.env.local` at repo root or `frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` (example: `http://localhost:5000/api`)
- Optional for map geocoding:
  - `NEXT_PUBLIC_GEOCODE_PROVIDER`
  - `NEXT_PUBLIC_MAPBOX_TOKEN`
  - `NEXT_PUBLIC_GEOCODE_COUNTRYCODES`
  - `NEXT_PUBLIC_GEOCODE_LANGUAGE`

### Backend (`backend/.env`)

Required baseline:
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `KYC_PYTHON_SERVICE_URL`
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)

Payments:
- `VNPAY_TMNCODE`
- `VNPAY_HASHSECRET`
- `VNPAY_URL`
- `VNPAY_RETURN_URL`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_API_BASE`
- `PAYPAL_RETURN_URL`

RAG / Atlas search:
- `MONGO_SEARCH_INDEX`
- `MONGO_VECTOR_INDEX`
- `MONGO_VECTOR_PATH`

### KYC Python Service

Add `.env` in `kyc-python-service/` if needed for threshold tuning:
- `KYC_FACE_MATCH_THRESHOLD`
- `KYC_MAX_IMAGE_BYTES`
- `KYC_PRELOAD_MODEL`
- `KYC_EASYOCR_GPU`

## 6. Installation

### 1) Install frontend dependencies

```bash
cd frontend
npm install
```

### 2) Install backend dependencies

```bash
cd ../backend
npm install
```

### 3) Install KYC Python dependencies

```bash
cd ../kyc-python-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks script execution, run (as needed):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 7. Run (3 Services)

Open 3 terminals:

### Terminal A - Backend

```bash
cd backend
npm run dev:nodemon
```

### Terminal B - Frontend

```bash
cd frontend
npm run dev
```

### Terminal C - KYC Python Service

```bash
cd kyc-python-service
.\venv\Scripts\Activate.ps1
uvicorn app:app --host 0.0.0.0 --port 8001
```

## 8. Useful Backend Scripts

From `backend/`:

- Setup Atlas search/vector indexes:
  - `npm run setup:atlas-indexes`
- Backfill property embeddings:
  - `npm run backfill:property-embeddings`
- Round property prices:
  - `npm run db:round-prices`
- Reset + seed sample data:
  - `npm run db:reset-seed`

## 9. API Documentation

After backend is running:

- Swagger UI: `http://localhost:5000/api-docs`
- Health check: `http://localhost:5000/api/health`

## 10. Default Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- KYC Python service: `http://localhost:8001`

## 11. Troubleshooting

- `Hydration failed`: clear stale cached UI state and verify i18n default language consistency.
- `429 Too many requests`: check backend rate-limit config and local test frequency.
- `KYC submit failed`: ensure KYC service is running and `KYC_PYTHON_SERVICE_URL` is correct.
- `Gemini API errors (400/invalid key)`: verify `GEMINI_API_KEY` and embedding model access.
- `VNPay/PayPal callback issues`: verify return URLs and `CLIENT_URL`/gateway env alignment.

## 12. Notes

- The current product direction is **mua bán bất động sản** (sale-oriented), not monthly rental.
- Appointment scheduling is not a standalone production module in the current implementation.
