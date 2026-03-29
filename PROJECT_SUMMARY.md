# PROJECT_SUMMARY

## 1. Introduction

### Overview
EstateManager is a full-stack real estate platform focused on **property sale workflows** (primary orientation is mua bán BĐS), combining listing discovery, provider operations, admin moderation, subscription monetization, identity verification (KYC), and AI-assisted consultation.  
The system connects buyers/users with verified providers, while giving admins centralized governance over listing quality, KYC trust, and subscription business performance.

### Core Value Proposition
- One unified platform for listing, discovery, communication, verification, and monetization.
- Hybrid search and map-first browsing for faster property matching.
- Trust and compliance through automated + manual KYC checks.
- Business-ready dashboards for providers and admins.
- Embedded AI assistant with retrieval, route guidance, and persistent conversation memory.

### Key Roles
- **User (Buyer):** browse/search properties, save favorites, chat with providers and AI, manage profile/KYC.
- **Provider (Owner/Agent):** create/manage listings, upgrade subscription plans, process KYC, track sales performance.
- **Admin:** moderate listings/providers/KYC, manage subscriptions, monitor platform-level KPIs.

---

## 2. Features List

### 2.1 Tính năng dành cho Người dùng (User / Buyer)

#### Authentication & Account
- Sign up, login, token refresh, forgot/reset password.
- Profile management (personal info), password change.
- Role request flow (user request to become provider).

#### Property Discovery & Search
- Home page with advanced search module and listing sections.
- Multi-criteria filtering by location text, type, bedrooms, bathrooms, area, and price ordering.
- Property recommendations by similarity from detail page.
- Geospatial query support (properties-within radius endpoint).
- Interactive map/listing experience with synchronized hover focus and detail navigation.

#### Property Detail Experience
- Full property profile: title, price, description, type, rooms, area, amenities, owner/provider contact.
- Image gallery and map location rendering in detail view.
- Direct chat entrypoint to provider from property detail.

#### Favorites
- Add/remove favorite properties.
- Favorite page with dedicated UI and confirmation modal for removal.
- Favorite status checking per property and navbar integration.

#### Real-time Messaging
- Floating chat widget (two-panel layout): conversation list + active conversation content.
- Realtime updates via Socket.IO (new message, unread count, read state).
- Image attachment support in direct messages.
- Property prefill modal when initiating conversation from property detail.
- One-way system notification conversations (Subscription bot) with send-back restriction.

#### AI Chatbot (RAG + Navigation Assistant)
- AI assistant conversation pinned in messaging panel.
- Property consultation using hybrid retrieval (structured filters + Atlas Search + Vector Search).
- Website route guidance from route knowledge + markdown knowledge base.
- Context-aware follow-up handling (reference previous listed item by index).
- Persistent chatbot memory in MongoDB:
  - recent turns,
  - user preference profile (budget/location/rooms/type/amenities/furnished),
  - periodic memory summary for long-context continuity.

#### Subscription & Payment
- Subscription purchase flow for provider plans (Pro/ProPlus) from frontend flow.
- VNPay and PayPal checkout integrations.
- Payment status page for success/failed/cancelled/error with redirect behavior.

#### Localization
- Bilingual UI (Vietnamese/English) via react-i18next.
- Navbar language toggle and persisted client locale.
- SSR/CSR consistency handling for i18n initialization.

#### KYC for User
- KYC submission with mandatory assets:
  - CCCD front image,
  - CCCD back image,
  - selfie portrait,
  - declared ID number.
- Real-time declared CCCD duplicate check.
- Auto decision + rejection reason display in Vietnamese.

---

### 2.2 Tính năng dành cho Provider (Owner / Agent)

#### Provider Dashboard & Navigation
- Multi-view provider dashboard (`dashboard`, `properties`, `plans`, `create`, `edit`, `kyc`).
- Sidebar controls, logout action, and integrated plan/kyc/listing operations in one space.

#### Listing Lifecycle Management
- Create, view, edit, delete listing.
- Upload property images and ownership documents.
- Listing status workflow support: `pending`, `approved`, `rejected`, `hidden`, `sold`.
- Re-submit rejected listing for moderation.
- Mark-as-sold with guard rails (only approved/hidden listings can be sold).
- Hide/show listing (visibility control) without deleting historical sales stats.

#### Subscription Management
- Plan overview and upgrade entry points (Free/Pro/ProPlus behavior).
- Checkout integration (VNPay/PayPal) and status tracking.
- Current subscription state and expiry-aware behavior.
- Listing quota enforcement by plan during property creation.

#### Sales Performance
- Provider sales statistics:
  - total sold properties,
  - total sold value,
  - latest sold time,
  - recent sold list.
- Persistent sales aggregation via dedicated stats collection.

#### Provider KYC
- Provider KYC upload and status tracking in dashboard.
- Display of rejection reasons and resubmission flow.
- Duplicate CCCD prevention against existing verified KYC records.

#### Messaging
- Realtime chat with users and AI assistant access from shared messaging widget.
- Property context message prefill to reduce friction in first contact.

#### Scope Note
- **Dedicated appointment scheduling module is not implemented as an independent production feature in the current codebase.**

---

### 2.3 Tính năng dành cho Quản trị viên (Admin)

#### Admin Dashboard
- Platform KPI overview:
  - users/providers/properties totals,
  - pending approvals,
  - subscription performance,
  - expiring-soon subscriptions.
- Visual analytics with chart widgets (property/provider distribution and subscription metrics).

#### Property Moderation
- Pending property queue with provider subscription-priority sorting (ProPlus > Pro > Free).
- Approve/reject moderation actions with rejection reason.
- Ownership document preview handling in moderation details.

#### Provider Moderation & Verification
- Pending provider queue (including role request context).
- Verify/reject provider KYC with guard checks.
- Linked role-request status updates after verification decision.

#### Subscription Administration
- View subscription/transaction records and status.
- Update subscription status (`active`, `expired`, `cancelled`).
- Revenue breakdown by plan and payment method.
- Expiry normalization logic and active/expired synchronization.

#### KYC Governance
- KYC management view for users/providers with status filters.
- Approve/reject restricted to submitted/reviewing states.
- Rule preventing admin override to verified when auto-KYC already rejected by service policy.
- Vietnamese rejection reason rendering for clarity.

#### Automated Operations
- Scheduled subscription reminder job:
  - creates/maintains system admin account `Subcription`,
  - sends 7-day expiry reminders to eligible users,
  - emits realtime message + unread updates via socket.

---

## 3. System Architecture

### 3.1 Frontend (Client-side)

#### Core Stack
- **Framework:** Next.js 16.x
- **Language:** TypeScript
- **UI Styling:** Tailwind CSS + custom global style system
- **State & Context:** React Context (`AuthContext`, `MessagingContext`)
- **Localization:** `i18next` + `react-i18next`
- **Charts:** Recharts
- **Map:** Leaflet
- **Realtime Client:** `socket.io-client`

#### Frontend Architectural Highlights
- Centralized API layer (`apiClient.ts`) with structured error handling.
- Feature-oriented service modules (`authService`, `propertyService`, `paymentService`, `messageService`, etc.).
- Role-aware pages and dashboards for admin/provider/user experiences.
- Dynamic client-only mount for realtime messaging widget.
- SSR hydration-stability improvements around i18n and dynamic UI blocks.

#### Key Frontend Modules
- Public browsing: home, listing/map, property detail.
- Account/KYC: profile settings, KYC pages.
- Commerce: checkout and payment status pages.
- Messaging: floating two-column chat workspace with AI tab and property prefill flow.

---

### 3.2 Backend (Server-side)

#### Core Stack
- **Runtime/Framework:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **AuthN/AuthZ:** JWT + role-based access control (user/provider/admin)
- **Validation:** Joi schemas in controller/middleware flow
- **Uploads:** Multer (memory storage, 20MB/file) + Cloudinary
- **Realtime Server:** Socket.IO
- **Jobs:** node-cron scheduled workers
- **API Docs:** Swagger (swagger-jsdoc + swagger-ui-express)

#### Main Domain Models
- `User`, `RoleRequest`, `Property`, `Favorite`, `Message`, `Transaction`, `Subscription`, `ProviderSalesStats`, `ChatbotMemory`.

#### API Surface (High-level)
- Auth APIs: signup/login/refresh/forgot/reset.
- User APIs: profile, password, KYC submit/check, role request, admin user management.
- Property APIs: CRUD, filters, recommendations, geo query, mark sold, visibility, sales stats.
- Payment APIs: create checkout, return callbacks (VNPay/PayPal), subscription status/history.
- Messaging APIs: conversations/messages/read/unread/send.
- Chatbot APIs: query memory read/clear.
- Admin APIs: dashboard, subscriptions, pending properties/providers, moderation/verification.

#### Operational Middleware
- Helmet, CORS, rate limiting, centralized error handling.
- Specialized handlers for multer limits, mongoose errors, and JWT failures.

---

### 3.3 AI, Retrieval, and KYC Subsystems

#### RAG Chatbot Subsystem
- LLM: Gemini (`gemini-2.5-flash` family via Google API).
- Retrieval layers:
  - structured Mongo query from extracted criteria,
  - Atlas text search index,
  - Atlas vector search index over property embeddings.
- Knowledge layers:
  - route/workflow knowledge map,
  - markdown knowledge sources (`property_type_mappings`, `amenity_aliases`, `web_navigation_guide`).
- Response shaping:
  - property-focused summaries with direct detail URLs,
  - navigation-focused route guidance,
  - mixed-intent response composition.

#### Chatbot Memory Subsystem
- Persistent memory document per user in MongoDB.
- Stores recent turns, preference profile, and compact summary.
- Auto-summary after configurable number of turns.
- Used as context for subsequent chatbot calls.

#### Property Embedding Subsystem
- Embedding generation from property attributes via Gemini embedding API.
- Auto refresh on property create/update (fire-and-forget queue).
- Backfill script for existing records without vectors.
- Atlas index setup script for text and vector search indices.

#### KYC Automation Subsystem (Python Microservice)
- Separate FastAPI service for OCR and face comparison.
- OCR pipeline: decode, card detection/crop, deskew, image enhancement, EasyOCR extraction, field confidence scoring.
- Face pipeline (current): **Detect -> Align -> Embed -> Compare** with fallback strategy.
- Backend KYC decision combines:
  - name match,
  - declared ID vs extracted ID match,
  - selfie vs CCCD portrait match,
  - OCR confidence safeguards,
  - Vietnamese rejection-reason synthesis.

---

## 4. Screenshots (Placeholders)

### User Pages
- [SCREENSHOT: Trang chủ với thanh tìm kiếm nâng cao]
- [SCREENSHOT: Trang danh sách bất động sản với bản đồ tương tác]
- [SCREENSHOT: Trang chi tiết bất động sản với bản đồ và nút "Chat với chủ sở hữu"]
- [SCREENSHOT: Hộp chat pop-up (cột trái: lịch sử chat với AI chatbot được ghim; cột phải: nội dung chat)]
- [SCREENSHOT: Modal soạn sẵn thông tin bất động sản khi khởi tạo chat]
- [SCREENSHOT: Trang danh sách bất động sản yêu thích]
- [SCREENSHOT: Trang gói đăng ký và thanh toán VNPay/PayPal]
- [SCREENSHOT: Thanh điều hướng (navbar) với nút chuyển đổi ngôn ngữ và icon yêu thích]
- [SCREENSHOT: Trang kết quả thanh toán /payment/{status} với điều hướng quay lại dashboard]

### Provider Pages
- [SCREENSHOT: Provider Dashboard với thống kê gói đăng ký và BĐS đã bán]
- [SCREENSHOT: Trang quản lý BĐS của Provider với tùy chọn "Đã bán" và "Ẩn tin"]
- [SCREENSHOT: Trang upload KYC cho Provider (CCCD trước/sau + selfie + trạng thái)]
- [SCREENSHOT: Khu vực gói dịch vụ trong Provider Dashboard với nút thanh toán]

### Admin Pages
- [SCREENSHOT: Admin Dashboard với thống kê doanh thu Subscription và gói sắp hết hạn]
- [SCREENSHOT: Trang duyệt bất động sản cho Admin]
- [SCREENSHOT: Trang duyệt Provider cho Admin]
- [SCREENSHOT: Trang quản lý KYC cho Admin (duyệt/từ chối + lý do)]
- [SCREENSHOT: Bảng quản lý Subscription trong Admin Dashboard]

---

## 5. Implementation Scope Notes (for downstream documentation agent)

- The platform currently targets **property sale** consultation and workflows; generated AI guidance should avoid framing primary business logic as monthly rental marketplace.
- Appointment scheduling is not a dedicated, standalone subsystem in the current production codebase.
- Swagger coverage has been expanded to include all currently implemented API endpoints and methods.
- KYC includes both automated decisioning and admin moderation constraints, with strict duplicate CCCD checks against verified records.
- Sales statistics are tracked with a dedicated provider sales aggregation model to preserve KPI integrity.
