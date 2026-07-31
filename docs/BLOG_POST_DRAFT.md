# Deploy một ứng dụng React + Spring Boot lên AWS bằng Docker

Trong project Shopsflow, tôi xây dựng một ứng dụng thương mại điện tử gồm React frontend, Spring Boot backend và PostgreSQL. Mục tiêu không chỉ là chạy được chức năng mà còn phải có kiến trúc triển khai, bảo mật, log và health check phù hợp với môi trường Cloud.

## Kiến trúc lựa chọn

Tôi sử dụng EC2 để chạy hai container: Nginx phục vụ React SPA và Spring Boot xử lý REST API. Nginx reverse proxy `/api` đến backend nên trình duyệt chỉ làm việc với một origin. Database được tách sang RDS PostgreSQL. CloudWatch Agent thu thập Docker logs cùng CPU, memory và disk metrics. EC2 dùng IAM role để ghi CloudWatch và optional S3 backup.

## Tại sao dùng RDS thay vì PostgreSQL container trên EC2?

PostgreSQL container phù hợp local development, nhưng production cần tách vòng đời database khỏi application server. RDS cung cấp managed backup, monitoring và cách kiểm soát network rõ ràng hơn. RDS Security Group chỉ nhận kết nối 5432 từ EC2 Security Group.

## Docker hóa frontend

Frontend được build bằng Node image rồi copy static files sang Nginx image. Cấu hình `try_files` đảm bảo React Router hoạt động khi refresh URL. `/api/` được proxy sang service backend.

## Docker hóa backend

Backend được build bằng Maven multi-stage image và chạy bằng JRE image nhỏ hơn. Actuator `/actuator/health` được dùng cho Docker health check. Container chạy bằng non-root user.

## Các lỗi đáng chú ý

Một lỗi quan trọng là JWT hết hạn có thể phát sinh exception trong filter trước khi request đến controller. Tôi xử lý các exception JWT và coi token đó là unauthenticated, nhờ vậy protected API trả `401` thay vì `500`.

Một vấn đề khác là order cancellation. Nếu chỉ đổi status sang `CANCELLED` mà không hoàn stock, inventory sẽ sai. Backend hiện chỉ cho phép workflow hợp lệ và hoàn lại số lượng product khi hủy order `PENDING` hoặc `PAID`.

Product đã có trong order cũng không được xóa vật lý vì order history cần product name và reference. Admin được hướng dẫn đặt stock về 0.

## Monitoring

CloudWatch Agent đọc Docker JSON logs và gửi vào log group `/shopsflow/ec2/docker`. Ngoài CPU mặc định, agent gửi memory và disk metrics. Dashboard và alarm giúp phát hiện container lỗi, máy thiếu tài nguyên hoặc RDS gần hết dung lượng.

## Kết quả

Project hoàn thiện customer flow từ đăng nhập, catalog, cart, checkout đến review; admin flow từ quản lý inventory đến fulfillment. Source đi kèm Docker Compose, AWS deployment guide, test scenarios, workshop guide và report draft.

## Bài học

- Network security quan trọng không kém code.
- Secret không được hard-code hoặc commit.
- Health check và logs phải được thiết kế từ đầu.
- Business rule như stock và order transition cần transaction và test rõ ràng.
- Một deployment tốt phải có cả hướng dẫn cleanup để tránh phát sinh chi phí ngoài ý muốn.
