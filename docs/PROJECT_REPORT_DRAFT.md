# BẢN NHÁP BÁO CÁO PROJECT — SHOPSFLOW

> Thay các phần `[Điền ...]` bằng thông tin thật, ảnh chụp AWS Console, URL GitHub, URL demo và số liệu CloudWatch trước khi nộp.

## 1. Thông tin sinh viên

- Họ và tên: `[Điền họ tên]`
- Mã sinh viên: `[Điền MSSV]`
- Email: `[Điền email]`
- Lớp: `[Điền lớp]`
- Trường: `[Điền trường]`
- Chuyên ngành: `[Điền chuyên ngành]`
- Giảng viên hướng dẫn: `[Điền tên giảng viên]`

## 2. Tên đề tài

**Shopsflow — Xây dựng và triển khai ứng dụng thương mại điện tử trên nền tảng AWS**

### 2.1. Bài toán

Các cửa hàng nhỏ cần một hệ thống bán hàng trực tuyến có chi phí triển khai thấp nhưng vẫn đảm bảo các chức năng quản lý sản phẩm, tồn kho, giỏ hàng, đơn hàng, đánh giá và phân quyền. Shopsflow được xây dựng để giải quyết bài toán này bằng kiến trúc web tách frontend/backend và triển khai trên hạ tầng AWS.

### 2.2. Mục tiêu

- Xây dựng giao diện web responsive cho customer và admin.
- Xây dựng REST API có JWT authentication và role-based authorization.
- Lưu trữ dữ liệu nhất quán bằng PostgreSQL và Flyway migration.
- Docker hóa hệ thống để triển khai lặp lại được.
- Triển khai ứng dụng trên EC2 và dữ liệu trên RDS.
- Thu thập log/metric bằng CloudWatch.
- Áp dụng security group và IAM theo nguyên tắc quyền tối thiểu.


## 2.3. Proposal

Nội dung proposal chi tiết nằm trong `docs/PROPOSAL.md`, gồm vấn đề, giải pháp, phạm vi, AWS services, kết quả mong đợi và risk management.

## 2.4. Blog/Post

Bản nháp bài viết kỹ thuật nằm trong `docs/BLOG_POST_DRAFT.md`. Sau khi triển khai thật, bổ sung ảnh kiến trúc, ảnh CloudWatch, URL demo và publish lên nền tảng được yêu cầu.

## 2.5. Events Participated

- Tên sự kiện AWS: `[Điền]`
- Thời gian: `[Điền]`
- Diễn giả/đơn vị: `[Điền]`
- Nội dung học được: `[Điền]`
- Ảnh/chứng nhận/link: `[Điền]`

## 2.6. Workshop Project

Workshop chi tiết nằm trong `docs/WORKSHOP_GUIDE.md`: triển khai React + Spring Boot + RDS trên EC2, cấu hình CloudWatch và optional S3 backup.

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React, TypeScript, Vite, Axios, React Router |
| Backend | Java 21, Spring Boot, Spring Security, JWT, JPA |
| Database | PostgreSQL 16, Flyway |
| Container | Docker, Docker Compose, Nginx |
| AWS | EC2, RDS, CloudWatch, IAM, S3 (backup tùy chọn) |
| Testing | JUnit, Mockito, ESLint, TypeScript build |

## 4. Chức năng hệ thống

### 4.1. Customer

- Đăng ký và đăng nhập.
- Tìm kiếm, lọc category, lọc giá, sắp xếp và phân trang product.
- Xem chi tiết và tồn kho.
- Quản lý giỏ hàng.
- Đặt hàng và xem lịch sử đơn.
- Tạo, sửa và xóa review.

### 4.2. Admin

- Quản lý categories và products.
- Theo dõi số product, category, open order và inventory value.
- Xem customer của từng order.
- Cập nhật trạng thái theo workflow hợp lệ.
- Hủy order và hoàn stock tự động.

## 5. Kiến trúc hệ thống

Chèn sơ đồ trong `docs/AWS_ARCHITECTURE.md` và ảnh kiến trúc đã vẽ bằng Draw.io/Lucidchart.

### 5.1. Thành phần

- Nginx trên EC2 phục vụ React SPA và reverse proxy `/api`.
- Spring Boot container xử lý API, authentication và business rules.
- RDS PostgreSQL lưu user, product, category, cart, order và review.
- CloudWatch Agent thu thập Docker logs và EC2 metrics.
- S3 lưu backup database hoặc file báo cáo/demo nếu sử dụng.

### 5.2. Bảo mật

- Password được băm bằng BCrypt.
- API protected bằng JWT.
- Endpoint admin dùng role `ADMIN`.
- RDS chỉ cho phép kết nối từ EC2 Security Group.
- Secret được truyền qua environment variable, không hard-code trong source.
- IAM instance role thay cho Access Key lưu trên máy chủ.

## 6. Tiến độ 8 tuần

| Tuần | Công việc | Kết quả/Minh chứng |
|---|---|---|
| 1 | Khảo sát bài toán, phân tích yêu cầu và kiến trúc Web Cloud | Use case, backlog, sơ đồ kiến trúc ban đầu |
| 2 | Xây dựng backend nền tảng: entity, repository, migration | PostgreSQL schema, Flyway V1/V2 |
| 3 | Xây dựng authentication, authorization và API product/category | Register/login, JWT, RBAC, Swagger |
| 4 | Hoàn thiện cart, order, review và business rules | API CRUD, stock checking, order workflow |
| 5 | Xây dựng React frontend và tích hợp API | Home, Catalog, Product Detail, Cart, Orders, Admin |
| 6 | Docker hóa FE/BE, kết nối PostgreSQL và chuẩn bị AWS | Dockerfile, Compose, environment config |
| 7 | Triển khai EC2 + RDS, cấu hình CloudWatch và kiểm thử | URL demo, log group, metric, alarms |
| 8 | Tối ưu, sửa lỗi, hoàn thiện tài liệu, video demo và báo cáo | Test result, report, workshop, source code |

## 7. Các vấn đề kỹ thuật đã giải quyết

### 7.1. Đồng bộ API FE/BE

Backend trả về `itemId`, `stockQuantity`, thông tin customer trong order và cấu trúc Spring Page. Frontend chuẩn hóa response tại API boundary để tránh lỗi khi dữ liệu null hoặc thiếu field.

### 7.2. JWT resilience

JWT sai hoặc hết hạn được coi là unauthenticated và protected endpoint trả `401`, thay vì làm filter phát sinh lỗi `500`.

### 7.3. Tính nhất quán tồn kho

- Không cho thêm cart vượt stock.
- Khi checkout, stock bị trừ trong transaction.
- Product sử dụng optimistic locking.
- Khi hủy order hợp lệ, stock được hoàn lại.

### 7.4. Bảo toàn lịch sử đơn hàng

Product đã xuất hiện trong order không được xóa vật lý. Admin có thể đặt stock về `0` để ẩn khả năng mua nhưng dữ liệu order cũ vẫn đọc được.

### 7.5. Khả năng vận hành

- Actuator health endpoint.
- Docker health checks.
- Graceful shutdown.
- CloudWatch log/metric configuration.
- Structured error response và server-side logging.

## 8. Triển khai AWS

### 8.1. EC2

- Instance type: `[Điền loại instance]`
- OS: `[Điền AMI]`
- Public URL/IP: `[Điền]`
- Containers: frontend Nginx và backend Spring Boot

### 8.2. RDS

- Engine: PostgreSQL
- Endpoint: `[Che một phần endpoint khi đưa vào báo cáo công khai]`
- Public access: No
- Backup retention: `[Điền]`
- Security Group source: EC2 Security Group

### 8.3. CloudWatch

- Log group: `/shopsflow/ec2/docker`
- Metrics: CPU, memory, disk, network
- Alarms: `[Chèn ảnh và mô tả alarm]`

### 8.4. S3

- Bucket: `[Điền bucket nếu sử dụng]`
- Mục đích: backup PostgreSQL/report artifact
- Encryption: `[SSE-S3 hoặc SSE-KMS]`
- Public access: Block all public access

## 9. Kiểm thử

Đưa bảng tổng hợp từ `docs/API_TEST_SCENARIOS.md` vào báo cáo:

| Nhóm | Số test | Passed | Failed |
|---|---:|---:|---:|
| Authentication | `[ ]` | `[ ]` | `[ ]` |
| Product/Category | `[ ]` | `[ ]` | `[ ]` |
| Cart/Order | `[ ]` | `[ ]` | `[ ]` |
| Review | `[ ]` | `[ ]` | `[ ]` |
| Security/Operations | `[ ]` | `[ ]` | `[ ]` |

Chèn ảnh:

- `npm run lint` passed.
- `npm run build` passed.
- `./mvnw test` passed trên máy cá nhân/CI.
- Swagger/API test.
- CloudWatch logs và dashboard.

## 10. Chi phí dự kiến

Lập bảng bằng AWS Pricing Calculator theo region và thời gian chạy thực tế:

| Dịch vụ | Cấu hình | Thời gian | Chi phí ước tính |
|---|---|---:|---:|
| EC2 | `[Điền]` | `[Điền]` | `[Điền]` |
| RDS | `[Điền]` | `[Điền]` | `[Điền]` |
| EBS | `[Điền]` | `[Điền]` | `[Điền]` |
| CloudWatch | `[Điền]` | `[Điền]` | `[Điền]` |
| S3 | `[Điền]` | `[Điền]` | `[Điền]` |

## 11. Kết quả đạt được

- Hoàn thành full-stack e-commerce flow từ authentication đến fulfillment.
- Có phân quyền USER/ADMIN.
- Có database migration và transaction cho nghiệp vụ quan trọng.
- Có Docker deployment và hướng dẫn AWS.
- Có health check, logging và monitoring design.
- Có test scenario và tài liệu vận hành.

## 12. Hạn chế và hướng phát triển

- Chưa tích hợp payment gateway thật.
- Chưa có upload ảnh trực tiếp lên S3; hiện product lưu image URL.
- Chưa triển khai Auto Scaling/Load Balancer trong cấu hình cơ bản.
- Có thể bổ sung Redis cache, email notification, CI/CD, CloudFront và WAF.

## 13. Self-evaluation

- Mức độ hoàn thành: `[Điền %]`
- Phần làm tốt: `[Điền]`
- Khó khăn lớn nhất: `[Điền]`
- Bài học AWS: `[Điền]`
- Kỹ năng cần cải thiện: `[Điền]`

## 14. Sharing and Feedback

- Link GitHub: `[Điền]`
- Link demo: `[Điền]`
- Link workshop/video: `[Điền]`
- Phản hồi nhận được: `[Điền]`
- Nội dung đã cải thiện sau feedback: `[Điền]`
