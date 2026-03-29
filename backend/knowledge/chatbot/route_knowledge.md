# Route Knowledge

```json
[
  {
    "route": "/",
    "title": "Trang chủ",
    "summary": "Xem danh sách bất động sản, tìm kiếm nhanh và truy cập các khu vực chính.",
    "keywords": ["home", "trang chủ", "tìm nhà", "xem bất động sản", "homepage"],
    "steps": [
      "Mở trang chủ để xem các bất động sản nổi bật.",
      "Dùng thanh tìm kiếm/lọc để chọn khu vực, mức giá và loại hình.",
      "Nhấn vào thẻ bất động sản để mở trang chi tiết."
    ]
  },
  {
    "route": "/auth/login",
    "title": "Đăng nhập",
    "summary": "Đăng nhập tài khoản để sử dụng chat, dashboard và các tính năng quản lý.",
    "keywords": ["đăng nhập", "login", "sign in", "vào tài khoản"],
    "steps": [
      "Vào trang đăng nhập.",
      "Nhập email và mật khẩu.",
      "Nhấn nút đăng nhập để vào hệ thống."
    ]
  },
  {
    "route": "/auth/register",
    "title": "Đăng ký",
    "summary": "Tạo tài khoản user/provider mới trên hệ thống.",
    "keywords": ["đăng ký", "register", "sign up", "tạo tài khoản"],
    "steps": [
      "Vào trang đăng ký.",
      "Điền thông tin cơ bản và chọn vai trò.",
      "Xác nhận đăng ký để tạo tài khoản mới."
    ]
  },
  {
    "route": "/properties/[id]",
    "title": "Chi tiết bất động sản",
    "summary": "Xem thông tin đầy đủ của một bất động sản và liên hệ chủ sở hữu.",
    "keywords": ["chi tiết", "xem nhà", "property detail", "chat với chủ", "liên hệ chủ"],
    "steps": [
      "Mở một bất động sản từ danh sách.",
      "Xem mô tả, vị trí, tiện ích và pháp lý.",
      "Nhấn nút chat để mở modal prefill và gửi tin cho chủ sở hữu."
    ]
  },
  {
    "route": "/profile/settings",
    "title": "Hồ sơ cá nhân",
    "summary": "Cập nhật thông tin cá nhân và quản lý cấu hình tài khoản.",
    "keywords": ["profile", "hồ sơ", "cài đặt tài khoản", "settings"],
    "steps": [
      "Mở trang hồ sơ cá nhân.",
      "Cập nhật tên, địa chỉ, số điện thoại hoặc avatar.",
      "Lưu thay đổi để cập nhật thông tin."
    ]
  },
  {
    "route": "/profile/change-password",
    "title": "Đổi mật khẩu",
    "summary": "Đổi mật khẩu tài khoản bảo mật hơn.",
    "keywords": ["đổi mật khẩu", "change password", "mật khẩu"],
    "steps": [
      "Mở trang đổi mật khẩu.",
      "Nhập mật khẩu hiện tại và mật khẩu mới.",
      "Xác nhận để hoàn tất cập nhật."
    ]
  },
  {
    "route": "/profile/kyc",
    "title": "KYC người dùng",
    "summary": "Nộp và theo dõi trạng thái xác minh danh tính.",
    "keywords": ["kyc", "xác minh", "cccd", "định danh"],
    "steps": [
      "Mở trang KYC.",
      "Tải lên ảnh CCCD mặt trước/sau.",
      "Theo dõi trạng thái duyệt hoặc lý do từ chối."
    ]
  },
  {
    "route": "/provider/dashboard",
    "title": "Provider Dashboard",
    "summary": "Quản lý tin đăng, gói dịch vụ, thanh toán và KYC cho provider.",
    "keywords": ["provider", "dashboard", "quản lý tin", "gói dịch vụ", "đăng tin"],
    "steps": [
      "Mở dashboard provider sau khi đăng nhập tài khoản provider.",
      "Chọn tab tương ứng để quản lý bất động sản, tạo tin mới hoặc nâng cấp gói.",
      "Theo dõi lịch sử thanh toán và trạng thái xác minh."
    ]
  },
  {
    "route": "/provider/dashboard?view=plans",
    "title": "Gói dịch vụ Provider",
    "summary": "Xem, nâng cấp và thanh toán gói đăng ký (Pro/ProPlus).",
    "keywords": ["gói", "subscription", "plan", "nâng cấp", "thanh toán gói"],
    "steps": [
      "Vào dashboard provider và chọn mục Gói dịch vụ.",
      "Chọn gói phù hợp và phương thức thanh toán.",
      "Hoàn tất thanh toán để kích hoạt quyền lợi."
    ]
  },
  {
    "route": "/provider/dashboard?view=properties",
    "title": "Quản lý bất động sản của Provider",
    "summary": "Xem danh sách tin đã đăng, sửa/xóa tin và theo dõi trạng thái duyệt.",
    "keywords": ["my properties", "quản lý bđs", "tin đăng của tôi", "provider properties"],
    "steps": [
      "Vào dashboard provider, chọn mục Bất động sản.",
      "Dùng thao tác sửa/xóa trên từng tin đăng.",
      "Theo dõi trạng thái duyệt và phản hồi từ admin."
    ]
  },
  {
    "route": "/provider/properties/create",
    "title": "Tạo tin mới",
    "summary": "Tạo tin bất động sản mới dành cho provider.",
    "keywords": ["đăng tin", "tạo tin", "create property", "post property"],
    "steps": [
      "Mở màn hình tạo tin.",
      "Nhập đầy đủ thông tin, ảnh và giấy tờ.",
      "Gửi tin để chờ admin duyệt."
    ]
  },
  {
    "route": "/admin/dashboard",
    "title": "Admin Dashboard",
    "summary": "Quản trị tổng quan hệ thống, duyệt tin và theo dõi hiệu suất.",
    "keywords": ["admin", "quản trị", "duyệt tin", "admin dashboard"],
    "steps": [
      "Đăng nhập tài khoản admin.",
      "Vào dashboard admin để xem số liệu tổng quan.",
      "Mở từng khu vực để duyệt tin và quản trị provider."
    ]
  },
  {
    "route": "/admin/kyc-management",
    "title": "Quản lý KYC",
    "summary": "Kiểm duyệt hồ sơ KYC người dùng/provider từ phía admin.",
    "keywords": ["kyc admin", "duyệt kyc", "xác minh admin", "kyc-management"],
    "steps": [
      "Mở trang quản lý KYC.",
      "Xem hồ sơ, dữ liệu OCR và trạng thái hiện tại.",
      "Phê duyệt hoặc từ chối với lý do cụ thể."
    ]
  },
  {
    "route": "/payment/[status]",
    "title": "Kết quả thanh toán",
    "summary": "Trang hiển thị trạng thái thanh toán thành công/thất bại/hủy.",
    "keywords": ["payment", "thanh toán", "kết quả thanh toán", "payment status"],
    "steps": [
      "Sau khi thanh toán, hệ thống chuyển về trang kết quả.",
      "Đọc trạng thái giao dịch và mã giao dịch.",
      "Dùng nút điều hướng để quay lại dashboard hoặc thử lại."
    ]
  }
]
```

