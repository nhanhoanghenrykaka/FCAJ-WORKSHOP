# Workshop: Deploy React + Spring Boot + PostgreSQL on AWS

## Mục tiêu

Sau workshop, người học có thể:

- Tạo EC2 và RDS với Security Group đúng.
- Triển khai ứng dụng Docker full-stack.
- Kết nối Spring Boot đến RDS.
- Kiểm tra health, API và giao diện.
- Thu thập logs/metrics bằng CloudWatch Agent.
- Thực hiện backup PostgreSQL lên S3 tùy chọn.

## Thời lượng đề xuất

120–150 phút.

## Điều kiện chuẩn bị

- AWS account và quyền tạo EC2, RDS, IAM, CloudWatch, S3.
- Kiến thức cơ bản về Linux, Docker và PostgreSQL.
- Source Shopsflow.
- Một terminal SSH hoặc Systems Manager Session Manager.

## Lab 1 — Chuẩn bị network

1. Tạo EC2 Security Group.
2. Cho phép HTTP 80.
3. Giới hạn SSH 22 theo IP hoặc dùng Session Manager.
4. Tạo RDS Security Group.
5. Chỉ cho phép 5432 từ EC2 Security Group.

**Checkpoint:** chụp ảnh inbound rules của hai Security Group.

## Lab 2 — Tạo RDS PostgreSQL

1. Tạo PostgreSQL instance.
2. Đặt database name `shopsflow`.
3. Tắt public access.
4. Chọn RDS Security Group.
5. Ghi lại endpoint và port.

**Checkpoint:** RDS status `Available`, EC2 có thể kết nối endpoint:5432.

## Lab 3 — Tạo EC2 và cài công cụ

1. Tạo Linux EC2 instance.
2. Gắn EC2 Security Group.
3. Gắn IAM role cho CloudWatch và optional S3.
4. Cài Docker, Docker Compose v2, Git, AWS CLI và CloudWatch Agent.
5. Đưa source lên EC2.

**Checkpoint:** `docker version` và `docker compose version` chạy thành công.

## Lab 4 — Cấu hình ứng dụng

```bash
cd Shopsflow-complete/deploy/aws
cp .env.aws.example .env.aws
chmod 600 .env.aws
```

Điền RDS endpoint, database credentials, JWT secret, public origin và initial admin.

**Checkpoint:** không có placeholder trong `.env.aws`.

## Lab 5 — Deploy

```bash
./deploy.sh
```

Kiểm tra:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml ps
curl http://127.0.0.1/health
curl http://127.0.0.1/api/products
```

Mở public IP của EC2, đăng nhập admin và tạo product.

**Checkpoint:** frontend và backend container đều healthy.

## Lab 6 — Kiểm thử business flow

1. Đăng nhập customer.
2. Add product vào cart.
3. Place order.
4. Đăng nhập admin.
5. Chuyển `PENDING → PAID → SHIPPED → DELIVERED`.
6. Tạo một order khác và cancel để kiểm tra stock restore.

**Checkpoint:** admin thấy customer, order total và status.

## Lab 7 — CloudWatch

1. Copy `cloudwatch-agent-config.json` vào thư mục config của agent.
2. Start CloudWatch Agent.
3. Mở log group `/shopsflow/ec2/docker`.
4. Tạo dashboard cho CPU, memory, disk và RDS metrics.
5. Tạo ít nhất một alarm.

**Checkpoint:** ảnh log stream và dashboard.

## Lab 8 — Backup S3 tùy chọn

1. Tạo private S3 bucket, block public access và bật encryption.
2. Cập nhật `S3_BACKUP_BUCKET`.
3. Chạy:

```bash
./backup_to_s3.sh
```

**Checkpoint:** object `.sql.gz` xuất hiện trong prefix `database/`.

## Cleanup

Sau khi demo/nộp bài:

- Tạo snapshot cần thiết.
- Xóa RDS nếu không dùng nữa.
- Terminate EC2.
- Xóa Elastic IP, load balancer hoặc volume không dùng.
- Xóa CloudWatch log group/S3 objects nếu không cần lưu.
- Kiểm tra Billing dashboard.
