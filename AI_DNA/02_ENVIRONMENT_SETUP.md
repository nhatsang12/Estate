# 02. ENVIRONMENT SETUP

## 1. Prerequisites
- Node.js (v18.x or higher)
- MongoDB (Local instance or MongoDB Atlas cluster)
- Cloudinary Account (for image hosting)

## 2. Backend Setup (`/backend`)

**Installation:**
```bash
cd backend
npm install
```

**Environment Variables (`backend/.env`):**
Create a `.env` file in the `backend` directory:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/estatemanager?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI/RAG Integration (Future)
OPENAI_API_KEY=sk-...
```

**Scripts:**
- `npm run dev`: Start server with Nodemon.
- `npm start`: Start server in production mode.
- `npm test`: Run Jest test suites.

## 3. Frontend Setup (`/RealEstateApp`)

**Installation:**
```bash
cd RealEstateApp
npm install
```

**Environment Variables (`RealEstateApp/.env.local`):**
Create a `.env.local` file in the `RealEstateApp` directory:
```env
# API Endpoint Connection
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Scripts:**
- `npm run dev`: Start Next.js development server.
- `npm run build`: Build for production.
- `npm run start`: Start production server.
- `npm run lint`: Run ESLint.