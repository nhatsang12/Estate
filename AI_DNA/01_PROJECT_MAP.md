# 01. PROJECT MAP: EstateManager (MiniProject)

## 1. Directory Tree
```text
MiniProject/
├── backend/                  # Node.js/Express API Server
│   ├── controllers/          # Business logic (authController, propertyController, userController)
│   ├── middleware/           # Custom middleware (validator, auth guard)
│   ├── models/               # Mongoose schemas (User, Property, Contract)
│   ├── routes/               # Express route definitions
│   ├── tests/                # Unit & Integration tests (Jest/Supertest)
│   ├── utils/                # Helpers (Cloudinary setup, error handlers)
│   ├── index.js              # Entry point of the server
│   ├── package.json          # Backend dependencies
│   └── .env                  # Environment variables (Hidden)
│
├── kyc-python-service/       # Python FastAPI KYC OCR Service
│   ├── app.py                # REST API for CCCD preprocessing + OCR
│   ├── requirements.txt      # Python dependencies (FastAPI, OpenCV, EasyOCR)
│   ├── Dockerfile            # Optional container runtime
│   └── README.md             # Local run and API usage
│
└── frontend/            # Next.js Frontend Client
    ├── components/           # Reusable UI (ListingCard, AdvancedSearchBar, AuthModal)
    ├── pages/                # Next.js file-based routing
    │   ├── admin/            # Admin dashboard pages
    │   ├── properties/       # Property detail pages [id].tsx
    │   ├── provider/         # Provider (Owner/Agent) dashboard
    │   ├── _app.tsx          # Global app wrapper
    │   └── index.tsx         # Landing page
    ├── services/             # API client services (propertyService.ts, authService.ts)
    ├── styles/               # Global CSS and CSS Modules
    ├── tailwind.config.js    # Tailwind configuration
    └── package.json          # Frontend dependencies
```

## 2. Component Roles
- **backend/models:** Define the NoSQL schema structure. Crucial for understanding the database design (especially GeoJSON in Property and Roles in User).
- **backend/controllers:** The brain of the API. Handles requests, talks to DB, and sends responses.
- **kyc-python-service/app.py:** Dedicated OCR pipeline (OpenCV preprocessing + EasyOCR extraction) for CCCD KYC.
- **RealEstateApp/components:** The building blocks of the UI. Follows Atomic Design principles.
- **RealEstateApp/services:** Abstraction layer for Axios calls. Keeps components clean from fetch logic.

## 3. Tech Stack
**Frontend:**
- Framework: Next.js (React)
- Language: TypeScript
- Styling: Tailwind CSS
- State Management: React Hooks (Context API)
- Maps: Leaflet & React-Leaflet

**Backend:**
- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB
- ODM: Mongoose (with GeoJSON support)
- Authentication: JSON Web Tokens (JWT) & bcryptjs
- File Uploads: Multer & Cloudinary SDK
- Testing: Jest & Supertest

**KYC Microservice:**
- Runtime: Python 3.11+
- Framework: FastAPI + Uvicorn
- OCR: EasyOCR (`vi`, `en`)
- Image Processing: OpenCV + Pillow
