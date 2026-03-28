# Kế hoạch Phát triển Toàn diện: Cải thiện EstatePlatform

**Mục tiêu tổng thể:** Khắc phục các lỗi hiện có và triển khai một loạt tính năng mới quan trọng cho nền tảng EstatePlatform, tập trung vào nâng cao trải nghiệm người dùng, khả năng quản lý của Provider và Admin, cùng với hệ thống xác thực KYC nâng cao.

**Team Agent Giả định (Codex acting as a Full-stack Developer):**
*   **Codex** sẽ đóng vai trò là Senior Full-stack Developer, chịu trách nhiệm cho cả frontend và backend.

**CRITICAL Requirements (lặp lại từ các prompt trước):**
*   **Frontend Work Directory:** `C:\Users\tkien\Downloads\estateplaform\frontend`
*   **Backend Work Directory:** `C:\Users\tkien\Downloads\estateplaform\backend`
*   **Design Principles:** Tất cả UI mới/sửa đổi phải tuân thủ nghiêm ngặt: Modern, Clean, Professional, Glassmorphism & Minimalist, Global Design System nhất quán, Typography hiện đại (sans-serif), Iconography chuyên nghiệp, Animations & Transitions tinh tế, và Responsive Design. **Tuyệt đối không sử dụng emoji trong UI.**
*   **Không ảnh hưởng code hiện có:** Đảm bảo việc triển khai KHÔNG ảnh hưởng tiêu cực đến các chức năng hoặc thành phần UI hiện có (trừ khi cần sửa lỗi đã biết).
*   **Database:** MongoDB là database chính cho backend.
*   **Gemini API Key:** Sử dụng rõ ràng Gemini API Key cho tất cả các tương tác LLM trong `ragChatbotService`.
*   **Chat Framework:** Tận dụng khung chat hiện có (pop-up chatbox, two-column layout, notification icon, v.v.).
*   **Chống Prompt Injection:** Tuân thủ các quy tắc chống Prompt Injection đã định nghĩa trong `C:\Users\tkien\Downloads\estateplaform\backend\RULE.md` cho mọi thành phần tương tác với LLM.

---

## Các Giai đoạn Phát triển:

### Giai đoạn 0: Đánh giá & Chuẩn bị Nền tảng (Assessment & Foundation Prep)

**Mục tiêu:** Hiểu rõ trạng thái hiện tại, chuẩn bị môi trường và các thành phần cốt lõi để các tính năng mới có thể được xây dựng vững chắc.

**Tasks:**

1.  **Đánh giá trạng thái dự án hiện tại:**
    *   **Frontend:** Kiểm tra cấu trúc thư mục, các component, và dependencies sau khi `npm install`. Đảm bảo project frontend có thể chạy được.
    *   **Backend:** Kiểm tra trạng thái của các service backend, API endpoints hiện có, và kết nối MongoDB.
    *   **Knowledge Base:** Xác nhận các file Markdown (`property_type_mappings.md`, `amenity_aliases.md`, `web_navigation_guide.md`) tồn tại trong `knowledge/` của project CrewAI, và `RULE.md` trong `backend/`.
2.  **Kiểm tra & Sửa lỗi tìm kiếm/lọc:**
    *   **Frontend:** Phân tích code hiện tại liên quan đến tìm kiếm và lọc bất động sản. Xác định nguyên nhân lỗi và triển khai sửa chữa.
    *   **Backend:** Kiểm tra các API tìm kiếm/lọc (`GET /api/properties`) và logic truy vấn MongoDB để đảm bảo chúng hoạt động chính xác.
3.  **Chuẩn bị cho Localization (`i18n`):**
    *   **Frontend:** Cài đặt thư viện `iNext18` (hoặc `react-i18next` nếu đó là ý của bạn) và cấu hình cơ bản cho việc chuyển đổi ngôn ngữ (Anh-Việt). Tạo các file ngôn ngữ placeholder ban đầu.
    *   **Backend (Optional):** Nếu cần hỗ trợ đa ngôn ngữ cho dữ liệu hoặc thông báo từ backend.

### Giai đoạn 1: Nâng cấp Core Backend & Database (Subscription & KYC Data Management)

**Mục tiêu:** Cập nhật schema database và triển khai các API backend cần thiết để hỗ trợ các tính năng mới về quản lý gói đăng ký và dữ liệu KYC.

**Tasks:**

1.  **Thiết kế & Triển khai `Subscriptions` Collection (MongoDB - Backend Architect):**
    *   **Mô tả:** Tạo một MongoDB Collection mới có tên `subscriptions` để quản lý các gói đăng ký của người dùng/provider.
    *   **Schema (Mongoose):** Thiết kế schema cho `subscriptions` bao gồm: `userId` (tham chiếu User/Provider), `planType`, `status` (`active`, `expired`, `cancelled`), `subscribedAt`, `expiresAt`, `durationDays`, `transactionId` (tham chiếu giao dịch), `lastRenewedAt`.
    *   **Indexes:** Tạo các index cần thiết để tối ưu truy vấn (ví dụ: `userId`, `expiresAt`, `status`).
2.  **Cập nhật `Users` & `Providers` Schema (MongoDB - Backend Architect):**
    *   **Mô tả:** Cập nhật `User` và `Provider` schema để liên kết với `subscriptions` collection (ví dụ: thêm `currentSubscriptionId`).
    *   **KYC Data:** Cập nhật `User` và `Provider` schema để lưu trữ thông tin KYC cần thiết (ví dụ: `kycStatus`, `kycDocuments[]` - URLs, `kycExtractedName`, `kycExtractedIDNumber`).
3.  **API cho Quản lý Gói đăng ký (Backend Architect):**
    *   Triển khai API để lấy trạng thái gói đăng ký của một Provider/User.
    *   Triển khai API để cập nhật trạng thái gói đăng ký (nếu cần cho các hành động quản trị).
4.  **API cho KYC Data Management (Backend Architect):**
    *   Triển khai API để gửi/cập nhật dữ liệu KYC (ảnh CCCD, thông tin).
    *   API để lấy trạng thái KYC.
5.  **API cho BĐS "Đã bán" (Backend Architect):**
    *   Cập nhật `properties` schema để thêm trường `isSold: Boolean` và `soldAt: Date`.
    *   API để đánh dấu một BĐS là "Đã bán" và lấy thống kê tổng tiền BĐS đã bán cho Provider.

### Giai đoạn 2: Nâng cấp Giao diện & Tương tác Bất động sản (Advanced Property Map & Listing UI)

**Mục tiêu:** Triển khai bản đồ tương tác trên trang danh sách và chi tiết bất động sản.

**Tasks:**

1.  **Tích hợp Bản đồ trên trang Danh sách BĐS (Frontend Developer):**
    *   **Chọn thư viện bản đồ:** Tích hợp một thư viện bản đồ (ví dụ: Leaflet.js hoặc Google Maps API).
    *   **Layout 2 cột:** Điều chỉnh layout của trang danh sách BĐS thành 2 cột: bên trái là danh sách, bên phải là bản đồ.
    *   **Hiển thị Marker:** Trên bản đồ, hiển thị các marker cho tất cả các BĐS trong danh sách.
    *   **Thông tin Hover Marker:** Khi trỏ chuột vào marker, hiển thị một pop-up/tooltip chứa ảnh và các thông tin liên quan của BĐS.
    *   **Nút "Vị trí của tôi":**
        *   Thêm nút "Vị trí của tôi" trên bản đồ (tương tự Google Maps).
        *   Khi nhấp, sử dụng GPS của trình duyệt để xác định vị trí hiện tại của người dùng.
        *   Di chuyển bản đồ đến vị trí đó và hiển thị các BĐS gần người dùng dựa trên vị trí GPS (yêu cầu backend có API tìm kiếm theo vị trí).
    *   **Hiển thị BĐS gần đây:** Kết hợp với API tìm kiếm geo-based của backend để hiển thị các BĐS phù hợp.
2.  **Nâng cấp Bản đồ trên trang Chi tiết BĐS (Frontend Developer):**
    *   Trên trang detail (`/properties/[id].tsx`), bản đồ phải hiển thị marker của BĐS đang xem.
    *   Marker của BĐS đang xem phải tự động hiện lên ảnh và thông tin liên quan (không chỉ dấu chấm xanh).
    *   Nếu có nhiều BĐS gần đó, cũng có thể hiện thị các marker khác (tùy chọn nâng cao).

### Giai đoạn 3: Tính năng UI/UX Nâng cao cho Người dùng (User Experience Enhancements)

**Mục tiêu:** Thêm các tính năng yêu thích và chuyển đổi ngôn ngữ.

**Tasks:**

1.  **Thêm tính năng Yêu thích (Frontend Developer & Backend Architect):**
    *   **Backend:** Cập nhật `favorites` collection (hoặc schema) để liên kết `userId` với `propertyId`. Triển khai API `POST /api/favorites` (thêm), `DELETE /api/favorites/:id` (xóa), `GET /api/favorites` (lấy danh sách yêu thích của người dùng).
    *   **Frontend:**
        *   Thêm biểu tượng trái tim (hoặc tương tự) trên thanh điều hướng (navbar) để hiển thị tổng số BĐS yêu thích và là nút truy cập nhanh.
        *   Khi nhấp vào biểu tượng trái tim, chuyển hướng đến trang danh sách BĐS yêu thích của người dùng.
        *   Trên mỗi Listing Card hoặc trang chi tiết BĐS, thêm nút/icon "Yêu thích" để người dùng có thể thêm/xóa khỏi danh sách yêu thích. Cập nhật trạng thái icon (đã yêu thích/chưa yêu thích) dựa trên trạng thái của người dùng.
2.  **Tích hợp Chuyển đổi Ngôn ngữ (Frontend Developer):**
    *   **Frontend:** Thêm nút chuyển đổi ngôn ngữ (Anh/Việt) trên thanh điều hướng (navbar).
    *   Sử dụng thư viện `i18n` (Next.js/React-i18next) để quản lý và chuyển đổi nội dung văn bản trên toàn bộ ứng dụng. Cần chuẩn bị các file ngôn ngữ (`en.json`, `vi.json`) ban đầu.

### Giai đoạn 4: Tính năng Provider Dashboard (Frontend & Backend)

**Mục tiêu:** Nâng cấp dashboard của Provider với các thông tin quản lý gói và hiệu suất bán hàng.

**Tasks:**

1.  **Hiển thị Trạng thái Gói đăng ký (Frontend Developer & Backend Architect):**
    *   **Backend:** Triển khai/cập nhật API để Provider có thể lấy thông tin chi tiết về gói đăng ký hiện tại của họ (`planType`, `status`, `subscribedAt`, `expiresAt`). Backend sẽ tính toán số ngày còn lại (`remainingDays`).
    *   **Frontend:** Trong Provider Dashboard, hiển thị rõ ràng "Gói đăng ký: [Tên gói]", "Ngày hết hạn: [Ngày]", "Còn lại: [X] ngày".
2.  **Thêm tùy chọn "Đã bán" & Thống kê doanh thu (Frontend Developer & Backend Architect):**
    *   **Backend:** API để Provider đánh dấu BĐS là "Đã bán". API để lấy tổng tiền BĐS đã bán của Provider.
    *   **Frontend:** Trong danh sách BĐS của Provider, thêm tùy chọn để đánh dấu BĐS là "Đã bán". Hiển thị thống kê "Tổng tiền BĐS đã bán: [Tổng tiền]" trong dashboard.
3.  **Tìm kiếm BĐS trong Dashboard (Frontend Developer & Backend Architect):**
    *   **Backend:** Triển khai/cập nhật API tìm kiếm BĐS của Provider theo các tiêu chí (ví dụ: tên, địa chỉ, trạng thái).
    *   **Frontend:** Thêm thanh tìm kiếm trong Provider Dashboard để Provider có thể tìm kiếm các BĐS của chính họ.

### Giai đoạn 5: Tính năng Admin Dashboard (Frontend & Backend)

**Mục tiêu:** Nâng cấp dashboard của Admin với các thống kê về gói đăng ký.

**Tasks:**

1.  **Thống kê Gói đăng ký (Frontend Developer & Backend Architect):**
    *   **Backend:** API để Admin có thể lấy tổng doanh thu từ bán gói Subscription. API để lấy danh sách các gói đăng ký sắp/đã hết hạn (dựa trên `subscriptions` collection).
    *   **Frontend:** Trong Admin Dashboard, hiển thị thống kê "Tổng tiền bán gói Subscription: [Tổng tiền]". Hiển thị danh sách các gói đăng ký sắp/đã hết hạn.
    *   **Quản lý `Subscriptions`:** Admin có thể xem và quản lý các `Subscription` trực tiếp từ bảng điều khiển.

### Giai đoạn 6: Xác thực KYC Nâng cao (Full-stack AI/ML Integration)

**Mục tiêu:** Triển khai hệ thống xác thực KYC tự động với việc so sánh hình ảnh và thông tin.

**Tasks:**

1.  **Frontend: Upload Ảnh KYC (Frontend Developer):**
    *   Trên trang KYC của người dùng/provider, triển khai component upload ảnh cho mặt trước/mặt sau của CCCD.
    *   Hiển thị preview ảnh đã tải lên.
    *   Gửi ảnh lên backend thông qua API.
2.  **Backend: Xử lý & So sánh Ảnh KYC (Backend Architect):**
    *   **API Upload:** API nhận và lưu trữ ảnh CCCD (ví dụ: trên Cloudinary).
    *   **OCR & Trích xuất thông tin:** Tích hợp một dịch vụ OCR (Optical Character Recognition) để trích xuất Họ và tên, Số CCCD từ ảnh CCCD.
    *   **So sánh Ảnh:** Tích hợp một thư viện hoặc dịch vụ nhận diện khuôn mặt/so sánh hình ảnh để so sánh ảnh selfie/avatar của người dùng với ảnh trên CCCD.
    *   **Logic Xác thực:** Triển khai logic backend để so sánh:
        *   Họ và tên (trích xuất từ CCCD) với Họ và tên đăng ký.
        *   Số CCCD (trích xuất từ CCCD) với số CCCD người dùng khai báo.
        *   Kết quả so sánh hình ảnh.
    *   **Cập nhật `kycStatus`:** Cập nhật trạng thái KYC của người dùng dựa trên kết quả xác thực.
    *   **Lưu trữ kết quả:** Lưu trữ kết quả trích xuất và so sánh vào `User` hoặc `Provider` schema.

### Giai đoạn 7: Kiểm thử & Tổng hợp (Testing & Integration)

**Mục tiêu:** Đảm bảo tất cả các tính năng mới hoạt động chính xác, ổn định và tích hợp mượt mà.

**Tasks:**

1.  **Kiểm thử Đơn vị & Tích hợp:** Thực hiện unit và integration tests cho tất cả các API backend, logic xử lý dữ liệu mới, và các component frontend.
2.  **Kiểm thử Chức năng & E2E:** Kiểm tra toàn bộ luồng chức năng của từng tính năng mới (tìm kiếm/lọc, bản đồ, yêu thích, ngôn ngữ, dashboard Provider/Admin, KYC).
3.  **Kiểm thử Hiệu suất:** Đánh giá hiệu suất của các tính năng sử dụng bản đồ và các API backend mới.
4.  **Kiểm thử Khả năng đáp ứng:** Đảm bảo UI/UX của các tính năng mới hoạt động tốt trên các thiết bị và kích thước màn hình khác nhau.


---

**Expected Deliverables from Codex (for each phase and overall):**

*   **Detailed Plan & Architecture Outline:** Kế hoạch từng bước cho mỗi giai đoạn.
*   **MongoDB Schema Updates (Mongoose):** Snippets code cho các schema mới và sửa đổi.
*   **Backend API Endpoints (Node.js/Express.js):** Snippets code cho các API mới, bao gồm logic xử lý.
*   **Frontend React Components (Next.js/TypeScript/Tailwind CSS):** Snippets code cho các component UI mới (Bản đồ, nút Yêu thích, nút Ngôn ngữ, các phần của Dashboard, KYC upload/modal).
*   **Localization Files:** Cấu trúc file ngôn ngữ mẫu.
*   **Testing Strategy:** Cách tiếp cận để kiểm thử từng tính năng.
*   **Báo cáo Tiến độ:** Cập nhật tiến độ sau mỗi giai đoạn hoặc khi có các mốc quan trọng.

---

Codex, hãy trình bày một kế hoạch chi tiết cho các giai đoạn này và bắt đầu triển khai theo từng bước một.
