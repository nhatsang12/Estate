# 04. REPLICATION STRATEGY

This document dictates the exact sequence and logic hooks an AI must follow to reconstruct this project from scratch without breaking dependencies.

## 1. Initialization Order (Strict Sequence)

**Phase 1: Foundation (Backend Core)**
1. Initialize Node.js project (`package.json`) and install dependencies (Express, Mongoose, dotenv, cors).
2. Create `backend/.env` (Mock values) and `backend/index.js` (Basic Express server with DB connection).
3. *Verification:* Run server. Must log "MongoDB Connected".

**Phase 2: Database Layer (Models)**
1. Create `backend/models/User.js`. Must include `bcrypt` pre-save hook.
2. Create `backend/models/Property.js`. Must include `location` field as GeoJSON and `2dsphere` index.
3. *Verification:* Insert a dummy property via MongoDB Compass to ensure indexing works.

**Phase 3: Business Logic & APIs (Controllers & Routes)**
1. Implement Authentication (`authController.js` & `userRoutes.js`). Must issue JWTs.
2. Implement custom middleware (`authMiddleware.js`) to verify JWT and check user roles.
3. Implement Property Logic (`propertyController.js` & `propertyRoutes.js`). Must include the geospatial query logic (`$near` or `$geoWithin`).
4. *Verification:* Use Postman to register, login (get token), and post a property using that token.

**Phase 4: Frontend Scaffolding (Next.js)**
1. Initialize Next.js project with TypeScript and Tailwind CSS.
2. Setup `RealEstateApp/.env.local` to point to the backend.
3. Create the API wrapper (`services/axiosSetup.ts` or individual services like `propertyService.ts`).

**Phase 5: Frontend Integration (UI & State)**
1. Build `AuthModal.tsx` and integrate with global state/Context for JWT storage.
2. Build `index.tsx` (Homepage) to fetch and display properties.
3. Build Provider Dashboard (`pages/provider/dashboard.tsx`) with form to submit new properties (integrating Cloudinary).

## 2. Critical Logic Hooks (Do Not Break)

- **Role-Based Access Control (RBAC):** Do not allow `User` or `Guest` to access `Provider` or `Admin` routes. The middleware must explicitly check `req.user.role`.
- **GeoJSON Format:** MongoDB strictly requires coordinates as `[longitude, latitude]`. Do not reverse them to `[latitude, longitude]` in the backend model, or geospatial queries will crash. Leaflet maps usually use `[lat, lng]`, so a conversion hook must exist in the frontend/backend bridge.
- **Password Hashing:** Ensure the `pre('save')` hook in `User.js` does NOT re-hash an already hashed password upon user updates. Always check `if (!this.isModified('password')) return next();`.
- **Subscription Quota:** Before creating a property, the system MUST check `User.listingsCount` against the allowed quota of their `User.subscriptionPlan`.

## 3. Post-Replication Verification Checklist
- [ ] Backend starts without crashing.
- [ ] Users can register and receive a JWT.
- [ ] Providers can upload an image (Cloudinary) and post a property.
- [ ] The Map UI successfully queries properties within a 5km radius using the `/api/properties/nearby` endpoint.
- [ ] Admin dashboard correctly retrieves properties with `status: 'pending'` for moderation.