# Các phần đã hoàn thiện

## Backend

- Bổ sung Actuator health check để dùng với Docker, EC2 và hệ thống giám sát.
- Cấu hình CORS bằng biến môi trường để FE chạy local hoặc tách domain trên AWS.
- Chuẩn hóa phản hồi `401/403` dạng JSON.
- Xử lý JWT hết hạn, sai chữ ký hoặc sai định dạng mà không làm API bị lỗi `500`.
- Chuẩn hóa email về chữ thường khi đăng ký/đăng nhập.
- Kiểm tra trùng email không phân biệt chữ hoa/chữ thường.
- Chuẩn hóa tên danh mục, kiểm tra trùng khi tạo và đổi tên.
- Kiểm tra khoảng giá tìm kiếm và danh sách category ID của sản phẩm.
- Ngăn xóa sản phẩm đã xuất hiện trong đơn hàng để bảo toàn lịch sử.
- Tự xóa sản phẩm khỏi giỏ hàng và review trước khi xóa sản phẩm chưa có đơn hàng.
- Bổ sung thông tin khách hàng vào response của đơn hàng cho trang admin.
- Bổ sung quy tắc chuyển trạng thái đơn hàng hợp lệ.
- Khi hủy đơn `PENDING` hoặc `PAID`, số lượng tồn kho được hoàn lại.
- Danh sách đơn admin được sắp xếp mới nhất trước.
- Bổ sung dữ liệu demo tùy chọn: admin, customer, categories, products và sample order.
- Thay `printStackTrace` bằng logging chuẩn và xử lý lỗi ràng buộc database.

## Frontend

- Đồng bộ kiểu dữ liệu đơn hàng với thông tin customer từ backend.
- Trang admin hiển thị tên và email khách đặt hàng.
- Dropdown trạng thái chỉ hiển thị các bước chuyển hợp lệ.
- Khóa dropdown khi đơn đã `DELIVERED` hoặc `CANCELLED`.
- Refresh inventory sau khi hủy đơn để số lượng tồn kho hiển thị đúng.
- Hiển thị hướng dẫn rõ khi admin chưa có đơn hàng.
- Bổ sung Dockerfile production và Nginx reverse proxy cho `/api`.

## DevOps và AWS

- Tạo Docker Compose full-stack gồm PostgreSQL, backend và frontend.
- Bổ sung health check cho tất cả container.
- Tạo cấu hình triển khai EC2 + RDS.
- Tạo cấu hình CloudWatch Agent thu thập Docker logs và host metrics.
- Tạo script deploy và script backup PostgreSQL lên S3.
- Bổ sung tài liệu kiến trúc, test scenario và bản nháp báo cáo 8 tuần.
