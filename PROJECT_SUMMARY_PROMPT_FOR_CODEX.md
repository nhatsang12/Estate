Act as a Senior Full-stack Developer who has just completed the implementation of the 'EstateManager' project. Your task is to **generate a comprehensive, high-level summary report of the ENTIRE COMPLETED WEBSITE**. This report will be a Markdown file, intended as a concise overview for a separate AI agent (Claude) to then generate the final, detailed project report, use case diagrams, and API documentation.

CRITICAL:
- The output must be a single Markdown file.
- **DO NOT include any code snippets.** This report should focus on descriptions and structure.
- **DO NOT include any actual images.** Instead, create clear placeholders with specific markers indicating where screenshots should be inserted.
- This summary should reflect the project as it *is after implementation*, incorporating all features discussed and planned (e.g., advanced search, interactive maps, messaging, RAG chatbot, subscription management, KYC, localization, admin/provider dashboards).
- Ensure the description of features and architecture is coherent and technically accurate, reflecting a fully implemented system.

---

### Task: Generate Comprehensive Website Summary Report (Markdown for Claude)

**Overall Goal:** Create a structured Markdown file summarizing the completed EstateManager platform, to serve as a consolidated source of information for final project documentation.

---

#### Section 1: Introduction

*   **Overview:** Provide a brief introduction to the EstateManager platform, its purpose (connecting users with properties, managing listings), and its core value proposition.
*   **Key Roles:** Briefly mention the main user roles supported (User/Tenant/Buyer, Provider/Owner/Agent, Admin).

#### Section 2: Features List

Categorize and list all implemented features for each user role. For each feature, provide a concise description of its functionality.

1.  **Tính năng dành cho Người dùng (User / Tenant / Buyer):**
    *   **Authentication & User Profile:** Đăng ký, Đăng nhập, Quên mật khẩu, Quản lý hồ sơ cá nhân.
    *   **Duyệt & Tìm kiếm Bất động sản:** Duyệt danh sách, Tìm kiếm nâng cao (vị trí/khu vực, khoảng giá, tiện ích, số phòng), Đề xuất vị trí.
    *   **Xem chi tiết Bất động sản:** Mô tả đầy đủ, Album ảnh/thư viện, Vị trí trên bản đồ, Thông tin liên hệ chủ sở hữu, thuộc tính BĐS.
    *   **Danh sách Yêu thích:** Thêm/Xóa BĐS vào yêu thích, Truy cập danh sách yêu thích (thông qua icon trên navbar).
    *   **Hệ thống Nhắn tin Real-time:** Hộp chat pop-up Shopee-like (hai cột: lịch sử chat, nội dung chat), gửi tin nhắn & ảnh, AI Chatbot được ghim, thông báo tin nhắn mới (icon trên navbar), modal soạn sẵn thông tin BĐS khi chat từ trang chi tiết.
    *   **Chatbot RAG:** Hỗ trợ truy vấn thông tin BĐS từ database (MongoDB Search & Vector Search), hướng dẫn sử dụng web (dựa trên web routes và Knowledge Base Markdown).
    *   **Quản lý Gói đăng ký:** Xem gói, Thanh toán VNPay, Xem trạng thái gói.
    *   **Chuyển đổi Ngôn ngữ:** Nút chuyển đổi Anh-Việt trên navbar.

2.  **Tính năng dành cho Chủ sở hữu/Đại lý (Provider / Agent):**
    *   **Đăng & Quản lý Bất động sản:** Đăng tải, xem, chỉnh sửa, xóa BĐS.
    *   **Tình trạng KYC:** Quản lý trạng thái KYC, tải lên tài liệu (CCCD), xem xét lý do từ chối.
    *   **Quản lý Lịch hẹn:** Xem yêu cầu đặt lịch, Phê duyệt/Từ chối/Thay đổi lịch hẹn.
    *   **Nhắn tin:** Nhận & trả lời tin nhắn từ người dùng, gửi hình ảnh.
    *   **Dashboard Cá nhân:** Xem thống kê gói đăng ký còn lại, tùy chọn "Đã bán" cho BĐS, thống kê tổng tiền BĐS đã bán, tìm kiếm BĐS cá nhân.

3.  **Tính năng dành cho Quản trị viên (Admin Dashboard):**
    *   **Quản lý CRUD:** Quản lý BĐS, Chủ sở hữu/Đại lý, Người dùng.
    *   **Kiểm duyệt Danh sách:** Phê duyệt/Từ chối danh sách mới, Vô hiệu hóa/Xóa danh sách đáng ngờ.
    *   **Báo cáo & Phân tích:** Theo dõi hiệu quả danh sách, Thống kê tổng quan nền tảng.
    *   **Quản lý Gói đăng ký:** Thống kê tổng tiền bán gói Subscription, thống kê gói sắp/đã hết hạn, Quản lý `Subscriptions` collection.
    *   **Xác thực KYC Nâng cao:** Hệ thống xác thực KYC tự động (OCR trích xuất thông tin, so sánh ảnh, logic match Họ tên/Số CCCD/Ảnh).

#### Section 3: System Architecture

Provide a high-level overview of the system's architecture, mentioning key components and technologies used in both frontend and backend.

1.  **Frontend (Client-side):**
    *   **Framework:** Next.js (or React.js).
    *   **Language:** TypeScript.
    *   **Styling:** Tailwind CSS.
    *   **API Client:** Axios/Fetch API (`apiClient.ts`).
    *   **Localization:** `i18n` (e.g., `react-i18next`).
    *   **Mapping Library:** Leaflet.js (or Google Maps API).
    *   **Real-time:** WebSocket Client (e.g., `socket.io-client`).
    *   **Key Components:** Layout, Auth (Modal/Pages), Property Listing/Detail, Advanced Search, Chatbox (two-column), Notification Icon, Property Details Pre-fill Modal.

2.  **Backend (Server-side):**
    *   **Runtime/Framework:** Node.js + Express.js.
    *   **Database:** MongoDB + Mongoose (for ODM).
    *   **Authentication:** JWT (Access Token + Refresh Token).
    *   **Authorization:** RBAC (Role-Based Access Control) for User, Admin, Provider roles.
    *   **Validation:** Joi/Zod + `express-validator`.
    *   **File Uploads:** Cloudinary or local storage (for property images, KYC documents).
    *   **Real-time:** WebSocket Server (e.g., `socket.io`).
    *   **Chatbot RAG Service:**
        *   **LLM:** Gemini (using `gemini-2.5-flash-preview-04-17` via Google API Key).
        *   **Retrieval:** MongoDB native Search & Vector Search (for `properties` data), Vector Database/Semantic Search for Knowledge Base documents.
        *   **Knowledge Base:** Markdown files (`property_type_mappings.md`, `amenity_aliases.md`, `web_navigation_guide.md`).
        *   **Prompt Injection Mitigation:** Adherence to `RULE.md` policies.
    *   **Error Handling & Logging:** Centralized middleware, standard API error response format.

#### Section 4: Screenshots (Placeholders)

Provide clear markers for where specific screenshots should be placed.

*   **User Pages:**
    *   `[SCREENSHOT: Trang chủ với thanh tìm kiếm nâng cao]`
    *   `[SCREENSHOT: Trang danh sách bất động sản với bản đồ tương tác]`
    *   `[SCREENSHOT: Trang chi tiết bất động sản với bản đồ và nút "Chat với chủ sở hữu"]`
    *   `[SCREENSHOT: Hộp chat pop-up (cột trái: lịch sử chat với AI chatbot được ghim; cột phải: nội dung chat)]`
    *   `[SCREENSHOT: Modal soạn sẵn thông tin bất động sản khi khởi tạo chat]`
    *   `[SCREENSHOT: Trang danh sách bất động sản yêu thích]`
    *   `[SCREENSHOT: Trang gói đăng ký và thanh toán VNPay]`
    *   `[SCREENSHOT: Thanh điều hướng (navbar) với nút chuyển đổi ngôn ngữ và icon yêu thích]`
*   **Provider Pages:**
    *   `[SCREENSHOT: Provider Dashboard với thống kê gói đăng ký và BĐS đã bán]`
    *   `[SCREENSHOT: Trang quản lý BĐS của Provider với tùy chọn "Đã bán" và tìm kiếm]`
    *   `[SCREENSHOT: Trang upload KYC cho Provider]`
*   **Admin Pages:**
    *   `[SCREENSHOT: Admin Dashboard với thống kê tổng tiền gói Subscription và danh sách gói hết hạn]`
    *   `[SCREENSHOT: Trang quản lý BĐS cho Admin]`
    *   `[SCREENSHOT: Trang quản lý KYC cho Admin (duyệt/từ chối)]`

---

**Expected Output:** A Markdown file named `PROJECT_SUMMARY.md` in the root of the `estateplaform` directory (`C:\Users\tkien\Downloads\estateplaform\PROJECT_SUMMARY.md`), containing the full summary as described above.
