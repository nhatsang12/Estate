# EstateManager Web Navigation Guide (Fallback Layer)

Lưu ý quan trọng:
- Nguồn điều hướng chuẩn trong hệ thống là `route_knowledge.md` (dữ liệu structured).
- File này chỉ dùng làm fallback narrative khi không tìm thấy route/workflow match trực tiếp.
- Không dùng file này để override route cụ thể đã có trong `route_knowledge.md`.

## 1. Fallback Cho Trường Hợp User Không Nhớ Tên Route

### 1.1 User chỉ nói mục tiêu, không nói trang
- Cách phản hồi: xác nhận mục tiêu, sau đó hướng người dùng tới route phù hợp nhất.
- Ưu tiên:
1. Route trực tiếp theo `route_knowledge.md`.
2. Nếu không có route match rõ ràng, đưa hướng dẫn thao tác theo menu.

### 1.2 User hỏi kiểu "bấm ở đâu"
- Trả lời ngắn theo bước:
1. Vào khu vực chính (Home / Provider Dashboard / Admin Dashboard).
2. Chọn tab chức năng gần nhất.
3. Nêu hành động cuối cùng (xem chi tiết, tạo checkout, gửi KYC, v.v.).

## 2. Fallback Cho Luồng Giao Dịch/Quản Trị

### 2.1 Subscription & Payment
- Nếu user không vào được trang gói:
1. Kiểm tra đã đăng nhập đúng role provider chưa.
2. Mở Provider Dashboard, chọn tab Gói dịch vụ.
3. Chọn gói và phương thức thanh toán.

### 2.2 KYC
- Nếu user/provider chưa thấy nút nộp KYC:
1. Vào trang hồ sơ hoặc dashboard role tương ứng.
2. Kiểm tra trạng thái KYC hiện tại.
3. Tải lại trang và thử nộp lại bộ hồ sơ đúng định dạng.

### 2.3 Moderation
- Nếu provider thắc mắc vì sao tin chưa hiển thị:
1. Vào khu vực Quản lý BĐS của provider.
2. Kiểm tra trạng thái `pending/rejected/sold/hidden`.
3. Nếu rejected, sửa và gửi lại.

## 3. Fallback Keyword Hỗ Trợ Nhận Diện Ý Định

- điều hướng, đi đâu, route, url
- vào trang nào, bấm ở đâu, thao tác thế nào
- không thấy nút, không thấy mục, không vào được
- gói dịch vụ, thanh toán, KYC, duyệt tin, dashboard

## 4. Chính Sách Trả Lời Khi Dùng Fallback Guide

- Chỉ đưa 1 lộ trình thao tác phù hợp nhất ở thời điểm hiện tại.
- Không liệt kê nhiều route nếu user chưa yêu cầu so sánh.
- Nếu đã có route chính xác từ `route_knowledge.md`, không lặp lại mô tả dài dòng từ file fallback này.
