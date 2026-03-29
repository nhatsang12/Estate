You are a Senior Computer Science Professor and Expert Software Architect. Your task is to write an extremely comprehensive, high-quality, and highly detailed project report for the "EstateManager" web platform. This report should be approximately **40 pages in length** (equivalent to roughly 1000 words per major sub-section or significant detail point, aiming for profound depth and extensive elaboration).

Your primary input for this task will be a Markdown file named `PROJECT_SUMMARY.md` (which will be provided to you by another AI agent, Codex). This `PROJECT_SUMMARY.md` contains a high-level overview of the completed EstateManager website, including its features, architecture, and screenshot placeholders.

Your role is to **take this high-level summary and expand it into a full, in-depth project report suitable for technical stakeholders, investors, or senior management.** You must also **generate descriptions for Use Case Diagrams and API Documentation**, based on the features and architecture described.

### STRICT REQUIREMENTS FOR THE REPORT:

1.  **Overall Length:** Aim for a total report length equivalent to approximately 40 A4 pages (Font Size 13). This means every section and sub-section below must be elaborated upon with significant academic, technical, and strategic depth.
2.  **Structure (Mandatory Headings & Subheadings):** The report MUST be structured logically using clear Markdown headings (`#`, `##`, `###`, `####`). Do NOT just give a summary. Follow this precise outline:

    # Project Report: EstateManager - Real Estate & Rental Property Management Platform

    ## 1. Executive Summary
    *   Provide a concise, high-level overview of the EstateManager platform, its core value, and key achievements, understandable by non-technical readers. This should be a compelling, one-page summary highlighting the most impactful aspects of the project.

    ## 2. Introduction to EstateManager
    *   **2.1. Vision and Mission:** Elaborate on the platform's long-term vision, mission, and the specific market problems it addresses within the real estate and rental sector. Discuss the strategic importance and potential impact of the platform.
    *   **2.2. Target Audience & Stakeholders:** Provide a detailed breakdown of the different user segments (buyers, renters, landlords, agents, administrators) and their specific needs and pain points that the platform aims to alleviate. Also, identify key business stakeholders and their interests.
    *   **2.3. Key Roles and Permissions (RBAC Deep Dive):** Detail the distinct user roles (User/Tenant/Buyer, Provider/Owner/Agent, Admin) and their granular permissions within the system. Explain the underlying Role-Based Access Control (RBAC) principles, why it was implemented (security, data integrity), and how different roles interact within the system.

    ## 3. Comprehensive Features List
    *   **Expand upon the "Features List" provided in `PROJECT_SUMMARY.md`. For each feature, do not just list it; provide a detailed explanation covering:**
        *   **3.X.1. Purpose:** What specific business problem or user need does this feature address?
        *   **3.X.2. Functionality & User Flow:** Describe in detail how the feature works from a user's perspective, including typical user interaction flows, key steps, and screen transitions.
        *   **3.X.3. Benefits:** Quantify or qualitatively describe the value this feature brings (e.g., improved efficiency, enhanced user experience, increased security, better data insights).
        *   **3.X.4. Technical Considerations (High-level):** Briefly mention the underlying technical approach or key technologies used for this specific feature (e.g., for real-time messaging, mention WebSockets; for search, mention MongoDB Search/Vector Search).

    *   **3.1. User / Tenant / Buyer Features:** (Elaborate on each bullet point from `PROJECT_SUMMARY.md` with profound detail, following the 3.X.1-4 structure.)
        *   Authentication & User Profile (Registration, Login, Forgot Password, Profile Management, Security aspects)
        *   Duyệt & Tìm kiếm Bất động sản (Deep dive into Advanced Search, filtering criteria, dynamic recommendations, geo-based search mechanisms)
        *   Xem chi tiết Bất động sản (Image Gallery with lazy loading, Interactive Map Integration, comprehensive Property Attributes, Contact Owner flow)
        *   Đặt lịch xem (Detailed scheduling process, confirmation, notification system)
        *   Danh sách Yêu thích (Functionality, persistence, UX for adding/removing, navbar integration)
        *   Hệ thống Nhắn tin Real-time (In-depth description of the chatbox UI, real-time message exchange mechanism using WebSockets, notification system, AI Chatbot integration, property details pre-fill modal functionality)
        *   Chatbot RAG (Detailed explanation of RAG capabilities for property queries and web navigation guidance, how MongoDB Search/Vector Search is leveraged, and the role of knowledge base Markdown documents)
        *   Quản lý Gói đăng ký (Subscription plans, VNPay payment flow, detailed subscription status tracking with expiration logic)
        *   Chuyển đổi Ngôn ngữ (Implementation details of `i18n` with `react-i18next`, impact on content delivery and user experience)

    *   **3.2. Provider / Owner / Agent Features:** (Elaborate on each bullet point from `PROJECT_SUMMARY.md` with profound detail, following the 3.X.1-4 structure.)
        *   Đăng & Quản lý Bất động sản (Comprehensive listing creation, editing, deletion, status changes, multi-image upload workflow, Cloudinary integration)
        *   Tình trạng KYC (KYC submission process, document upload, status updates, communication of rejection reasons)
        *   Quản lý Lịch hẹn (Detailed approval, rescheduling, cancellation workflow, notification system)
        *   Nhắn tin (Interaction with users, real-time aspects, notification handling)
        *   Dashboard Cá nhân (In-depth explanation of subscription stats, "Đã bán" option implementation, sales statistics calculation, property search within dashboard)

    *   **3.3. Administrator (Admin) Features:** (Elaborate on each bullet point from `PROJECT_SUMMARY.md` with profound detail, following the 3.X.1-4 structure.)
        *   Quản lý CRUD (Deep dive into managing Properties, Users, Providers – including the underlying API calls and data models)
        *   Kiểm duyệt Danh sách (Comprehensive moderation workflow, approval/rejection process with rationale, disabling/deleting suspicious listings)
        *   Báo cáo & Phân tích (Types of reports available, key performance indicators (KPIs) tracked for listings and overall platform health, data visualization aspects)
        *   Quản lý Gói đăng ký (Detailed explanation of subscription revenue tracking, expiration management, direct management of `Subscriptions` collection, including CRUD operations if applicable)
        *   Xác thực KYC Nâng cao (In-depth explanation of the automated KYC verification system, OCR integration, image comparison techniques, matching logic for names/ID/photos, status updates, and manual override options)

    ## 4. System Architecture
    *   **Expand upon the "System Architecture" provided in `PROJECT_SUMMARY.md`. For each component, provide a detailed technical explanation covering:**
        *   **4.X.1. Role and Responsibilities:** What is the primary function of this component in the overall system?
        *   **4.X.2. Key Technologies:** List and describe the core technologies, frameworks, and libraries used.
        *   **4.X.3. Internal Mechanism/Data Flow:** Explain HOW the component works internally, how data flows through it, and how it interacts with other components. Mention specific algorithms, data structures, or architectural patterns (e.g., for APIs, discuss request/response cycles, middleware; for database, discuss schema design and indexing strategy).
        *   **4.X.4. Scalability & Performance Considerations:** Discuss how the component is designed for scalability (e.g., statelessness, load balancing, caching, CDN usage if applicable) and performance optimization.
        *   **4.X.5. Security Considerations:** Detail the security measures implemented (e.g., authentication, authorization, input validation, prompt injection mitigation).

    *   **4.1. Frontend (Client-side):** (Elaborate on each bullet point from `PROJECT_SUMMARY.md` with profound detail, following the 4.X.1-5 structure.)
        *   Framework (Next.js/React.js - Justification for choice, key features leveraged)
        *   Language (TypeScript - Benefits for type safety, maintainability)
        *   Styling (Tailwind CSS - Utility-first approach, design system integration)
        *   API Client (Axios/Fetch API - `apiClient.ts` implementation, error handling, JWT injection)
        *   Localization (`i18n` / `react-i18next` - Implementation strategy, language file management)
        *   Mapping Library (Leaflet.js/Google Maps API - Integration, performance, custom markers)
        *   Real-time (WebSocket Client - `socket.io-client` integration, event handling)
        *   Key Components (Detailed explanation of Layout, Auth, Property Listing/Detail, Advanced Search, Chatbox, Notification Icon, Property Details Pre-fill Modal - their internal structure and interaction patterns).

    *   **4.2. Backend (Server-side):** (Elaborate on each bullet point from `PROJECT_SUMMARY.md` with profound detail, following the 4.X.1-5 structure.)
        *   Runtime/Framework (Node.js + Express.js - Justification, middleware architecture)
        *   Database (MongoDB + Mongoose - Schema design principles, indexing strategies including `2dsphere`, aggregation pipelines, connection management)
        *   Authentication (JWT - Access Token + Refresh Token flow, token validation, secure storage)
        *   Authorization (RBAC - Implementation with middleware, role definitions, permission checks)
        *   Validation (Joi/Zod + `express-validator` - Request body, query, route parameter validation)
        *   File Uploads (Cloudinary or local storage - Upload workflow, security, file transformation)
        *   Real-time (WebSocket Server - `socket.io` implementation, event broadcasting, scaling WebSockets)
        *   Chatbot RAG Service (In-depth explanation of RAG architecture, LLM interaction with Gemini, MongoDB native Search & Vector Search mechanisms, Knowledge Base ingestion and retrieval pipeline, Prompt Injection Mitigation strategies from `RULE.md`)
        *   Error Handling & Logging (Centralized middleware, standard API error response format, logging tools and practices)

    ## 5. Database Design (MongoDB)
    *   **5.1. Collection Overview:** Provide a detailed description of each MongoDB collection.
        *   `properties`: Fields (title, description, price, location { type, coordinates }, images[], amenities[], ownerId, isSold, soldAt), Indexes (`2dsphere`, text indexes, standard indexes).
        *   `users`: Fields (name, email, passwordHash, role, kycStatus, kycDocuments[], currentSubscriptionId), Indexes.
        *   `providers`: Fields (similar to users, but with additional provider-specific fields like `agencyName`, `contactNumber`, `kycStatus` - ensure distinction from `users`), Indexes.
        *   `viewings`: Fields (propertyId, userId, scheduledTime, status, notes), Indexes.
        *   `favorites`: Fields (userId, propertyId), Indexes.
        *   `messages`: Fields (conversationId, senderId, receiverId, messageType, content, imageUrl, timestamp, isRead), Indexes.
        *   `subscriptions`: Fields (userId, planType, status, subscribedAt, expiresAt, durationDays, transactionId, lastRenewedAt), Indexes.
    *   **5.2. Relationships:** Explain the expected relationships between collections (one-to-one, one-to-many, many-to-many) and how they are handled in a NoSQL context (e.g., embedding, referencing).
    *   **5.3. Indexing Strategy:** Justify the choice of indexes for performance, including `2dsphere` for geo-queries.

    ## 6. API Documentation Overview (for Postman/Swagger/OpenAPI)
    *   **Provide a high-level overview and examples of the API documentation, as if generating a Postman collection or Swagger/OpenAPI spec.**
    *   **6.1. General Structure:** Explain how APIs are grouped (e.g., Auth, Users, Properties, Payments, Chatbot, Messaging, Admin).
    *   **6.2. Authentication & Authorization:** Detail how JWT tokens are used (`Bearer` token in header), refresh token mechanism, and RBAC implementation for different endpoints.
    *   **6.3. Key Endpoint Examples (for each major category, illustrate with Method, URL, Request Body Example, Response Body Example, Success Codes, Error Codes):**
        *   `POST /api/auth/signup`
        *   `POST /api/auth/login`
        *   `GET /api/properties` (with pagination, filters: location, price, amenities)
        *   `GET /api/properties/:id`
        *   `POST /api/payments/create-checkout`
        *   `POST /api/chatbot/query` (for RAG chatbot)
        *   `POST /api/messages` (send message)
        *   `GET /api/conversations` (list of chat conversations)
        *   `GET /api/messages/:conversationId` (chat history)
        *   `PATCH /api/users/kyc/submit` (KYC upload)
        *   `GET /api/admin/subscriptions` (Admin: list subscriptions)
        *   `PATCH /api/admin/properties/:id/moderate` (Admin: moderate property)
    *   **6.4. Standard API Error Response Format:** Describe the consistent JSON structure for error responses (e.g., `{"status": "fail", "message": "...", "code": "..."}`).

    ## 7. Use Case Diagrams, Class diagram, Sequence diagram
   

    ## 8. Security Considerations
    *   **8.1. Authentication (JWT):** Deep dive into JWT implementation, refresh tokens, token revocation, and secure storage.
    *   **8.2. Authorization (RBAC):** Explain how RBAC is enforced across the system, role definitions, and permission checks.
    *   **8.3. Data Validation:** Discuss input validation on both frontend and backend (Joi/Zod), and its role in preventing common vulnerabilities.
    *   **8.4. Prompt Injection Mitigation:** Detail the implementation of rules from `RULE.md` in the `ragChatbotService` to protect against prompt injection (delimiters, explicit refusal, least privilege for tools, input/output sanitization, context isolation).
    *   **8.5. File Upload Security:** Measures taken for secure file uploads (Cloudinary, validation of file types/sizes).
    *   **8.6. CORS Policy:** Explain how CORS is configured and managed.

    ## 9. Performance Optimization Strategies
    *   **9.1. Frontend Performance:** Discuss Core Web Vitals optimization, code splitting, lazy loading, image optimization, caching strategies (browser, CDN).
    *   **9.2. Backend Performance:** Explain API caching, database indexing (`2dsphere` for geo-queries), query optimization, and efficient data retrieval.
    *   **9.3. Real-time Performance:** Discuss WebSocket scaling, efficient message broadcasting.

    ## 10. Scalability and High Availability
    *   **10.1. Horizontal Scaling:** How the backend services (Node.js/Express.js) are designed for horizontal scaling (stateless services, load balancing).
    *   **10.2. Database Scaling:** MongoDB scaling strategies (replica sets, sharding).
    *   **10.3. Cloud Infrastructure:** Discuss potential cloud deployment strategies (e.g., Docker/Kubernetes on AWS/GCP/Azure, serverless functions) for high availability.

    ## 11. Testing Strategy and Quality Assurance
    *   **11.1. Unit Testing:** Frameworks (Jest), coverage, what is tested.
    *   **11.2. Integration Testing:** Frameworks (Supertest for APIs), how different modules/services are tested together.
    *   **11.3. End-to-End (E2E) Testing:** Tools, key user flows tested.
    *   **11.4. Performance Testing:** Tools, metrics monitored.
    *   **11.5. Security Testing:** Tools/methods used (e.g., vulnerability scanning, penetration testing).
    *   **11.6. User Acceptance Testing (UAT):** Role of stakeholders in final validation.

    ## 12. Deployment Strategy (Optional/Future)
    *   **12.1. Backend Deployment:** Recommended platforms (Render / Railway / Fly.io), CI/CD pipelines.
    *   **12.2. Frontend Deployment:** Recommended platforms (Vercel / Netlify), CI/CD pipelines.
    *   **12.3. Monitoring & Logging:** Tools and strategies for production monitoring.

    ## 13. Future Enhancements / Roadmap
    *   Suggest potential future features or improvements (e.g., enhanced AI chatbot capabilities, advanced analytics, payment gateway integrations, mobile app).

    ## 14. Conclusion
    *   Summarize the achievements of the project and reiterate its value proposition and readiness for market.

    ## 15. Screenshots (Integration)
    *   **Integrate the screenshot placeholders directly from `PROJECT_SUMMARY.md`. For each placeholder, provide a brief description of what the screenshot depicts and its significance.** For instance:
        ```markdown
        ### 15.1. Trang chủ với thanh tìm kiếm nâng cao
        [SCREENSHOT: Trang chủ với thanh tìm kiếm nâng cao]
        *   **Mô tả:** Ảnh chụp màn hình trang chủ cho thấy giao diện người dùng chính với banner quảng cáo và thanh tìm kiếm nâng cao cho phép lọc bất động sản theo nhiều tiêu chí.
        *   **Ý nghĩa:** Minh họa điểm nhập chính của người dùng vào hệ thống, nhấn mạnh khả năng tìm kiếm mạnh mẽ và UI hiện đại.
        ```
    *   Repeat this pattern for all placeholders provided in `PROJECT_SUMMARY.md`.

---

**Input:** You will receive the `PROJECT_SUMMARY.md` file (which will be generated by Codex based on its completed implementation).

**Expected Output:** A single, comprehensive Markdown file named `FINAL_PROJECT_REPORT.md` in the root of the `estateplaform` directory (`C:\Users\tkien\Downloads\estateplaform\FINAL_PROJECT_REPORT.md`), containing the full 40-page report as described above.
