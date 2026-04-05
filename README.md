# Estate Platform

Estate Platform la du an web quan ly va giao dich bat dong san gom 3 phan:

- `frontend`: ung dung Next.js cho nguoi dung, provider, admin
- `backend`: API Node.js/Express + MongoDB + Socket.IO
- `kyc-python-service`: FastAPI service OCR/KYC

## Yeu cau he thong

- Node.js 20+
- npm 10+
- MongoDB (local hoac Atlas)
- Python 3.11+ (de chay KYC service)

## Cau truc thu muc

```text
estateplaform/
  backend/
  frontend/
  kyc-python-service/
```

## Cai dat nhanh

1. Cai dependency cho backend

```bash
cd backend
npm install
```

2. Cai dependency cho frontend

```bash
cd ../frontend
npm install
```

3. Cai dependency cho KYC service (neu can OCR/KYC)

```bash
cd ../kyc-python-service
pip install -r requirements.txt
```

## Cau hinh backend env

File env mau: `backend/.env.example`

Tao file chay local:

```bash
cd backend
copy .env.example .env
```

Cap nhat cac bien bat buoc truoc khi chay:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `VNPAY_TMNCODE`
- `VNPAY_HASHSECRET`
- `VNPAY_URL`
- `VNPAY_RETURN_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY` hoac `GOOGLE_API_KEY`

## Chay du an

1. Chay backend

```bash
cd backend
npm run dev
```

2. Chay frontend

```bash
cd frontend
npm run dev
```

3. Chay KYC service (neu can)

```bash
cd kyc-python-service
uvicorn app:app --host 0.0.0.0 --port 8001
```

## Port mac dinh

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Swagger: `http://localhost:5000/api-docs`
- KYC service: `http://localhost:8001`
