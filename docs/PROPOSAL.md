# Proposal — Shopsflow on AWS

## 1. Tên project

**Shopsflow — Full-stack E-commerce Application on AWS**

## 2. Vấn đề

Một cửa hàng nhỏ cần website bán hàng có quản lý catalog, tồn kho, giỏ hàng, đơn hàng, review và phân quyền. Việc tự quản lý database, backup, log và triển khai thủ công dễ gây mất dữ liệu hoặc downtime.

## 3. Giải pháp

Xây dựng React frontend và Spring Boot REST API, đóng gói bằng Docker. Ứng dụng chạy trên Amazon EC2, dữ liệu lưu trong Amazon RDS PostgreSQL, log/metric gửi đến CloudWatch. IAM role cung cấp quyền cho EC2 mà không lưu Access Key trong source. S3 được dùng tùy chọn cho backup.

## 4. Phạm vi chức năng

- Authentication và role USER/ADMIN.
- Product/category management.
- Search, filter, sort, pagination.
- Cart và checkout.
- Order history và admin fulfillment workflow.
- Review CRUD.
- Health check, structured error, Docker deployment và monitoring.

## 5. AWS services

| Dịch vụ | Vai trò |
|---|---|
| EC2 | Chạy Nginx frontend và Spring Boot backend |
| RDS PostgreSQL | Managed relational database |
| CloudWatch | Logs, metrics, dashboard và alarms |
| IAM | Instance role và least-privilege permissions |
| S3 | Backup database/report artifact tùy chọn |

## 6. Kết quả mong đợi

- Website truy cập được từ Internet.
- Backend kết nối private RDS.
- Admin quản lý catalog và order.
- CloudWatch hiển thị logs và metrics.
- Có source code, kiến trúc, test scenarios, workshop và báo cáo.

## 7. Rủi ro và biện pháp

| Rủi ro | Biện pháp |
|---|---|
| Lộ secret | Environment variables, IAM role, không commit `.env` |
| RDS mở public | Private access, SG chỉ nhận từ EC2 SG |
| Mất dữ liệu | RDS automated backup và optional S3 dump |
| Hết stock do concurrent checkout | Transaction và optimistic locking |
| Container lỗi | Health check, restart policy, CloudWatch logs |
| Chi phí vượt dự kiến | Tắt/xóa resource sau demo, đặt billing alert |
