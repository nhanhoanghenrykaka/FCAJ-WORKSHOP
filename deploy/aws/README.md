# Triển khai Shopsflow lên AWS

Kiến trúc cơ bản: **EC2 + RDS PostgreSQL + CloudWatch + IAM**, tùy chọn backup lên **S3**.

## 1. Tạo network và security group

### EC2 Security Group

- HTTP `80`: mở cho người dùng demo.
- HTTPS `443`: mở khi đã cấu hình chứng chỉ/reverse proxy HTTPS.
- SSH `22`: chỉ mở từ IP quản trị, hoặc dùng Systems Manager Session Manager.

### RDS Security Group

- PostgreSQL `5432`: source là **EC2 Security Group**, không phải `0.0.0.0/0`.

## 2. Tạo RDS PostgreSQL

- Engine: PostgreSQL.
- Database name: `shopsflow`.
- Public access: `No`.
- Lưu endpoint, port, username và password.
- Bật automated backup phù hợp với thời gian demo.

Flyway sẽ tự tạo schema khi backend kết nối lần đầu.

## 3. Tạo EC2

- Chọn Linux AMI hỗ trợ Docker.
- Gắn EC2 Security Group.
- Gắn IAM instance role có quyền gửi CloudWatch logs/metrics.
- Thêm quyền S3 tối thiểu nếu sử dụng `backup_to_s3.sh`.

Cài Docker, Docker Compose v2, Git, AWS CLI và CloudWatch Agent theo package manager của AMI đang dùng.

## 4. Đưa source lên EC2

Có thể clone Git repository hoặc upload thư mục `Shopsflow-complete` lên EC2.

```bash
cd Shopsflow-complete/deploy/aws
cp .env.aws.example .env.aws
```

Điền các biến:

- `DB_HOST`: RDS endpoint.
- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`.
- `JWT_SECRET`: Base64 secret đủ dài.
- `CORS_ALLOWED_ORIGINS`: URL public của ứng dụng.

Bảo vệ file:

```bash
chmod 600 .env.aws
```

## 5. Kiểm tra kết nối RDS

Trước khi deploy, xác nhận EC2 có thể kết nối port 5432 đến RDS. Nếu không kết nối được, kiểm tra:

- RDS status.
- Route/subnet.
- RDS Security Group source.
- DB endpoint, port và credentials.

## 6. Deploy containers

```bash
./deploy.sh
```

Kiểm tra:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml ps
docker compose --env-file .env.aws -f docker-compose.aws.yml logs -f backend
curl http://127.0.0.1/health
curl http://127.0.0.1/api/products
```

Mở public IP hoặc domain của EC2 trong trình duyệt.

## 7. Cấu hình CloudWatch Agent

Copy file config:

```bash
sudo cp cloudwatch-agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/shopsflow.json
```

Khởi động agent bằng control script được cài cùng CloudWatch Agent, sử dụng file config trên. Sau đó kiểm tra:

- Log group `/shopsflow/ec2/docker`.
- Namespace `Shopsflow/EC2`.
- Metric memory và disk.

Tạo alarm tối thiểu:

- EC2 CPU cao.
- Memory used cao.
- Disk used cao.
- RDS free storage thấp.
- RDS database connections bất thường.

## 8. Backup lên S3

Tạo private S3 bucket, bật block public access và encryption. IAM role của EC2 chỉ cần quyền ghi vào prefix backup của bucket.

```bash
./backup_to_s3.sh
```

Có thể tạo cron chạy mỗi ngày. Kiểm tra restore thử trước khi xem backup là hoàn chỉnh.

## 9. HTTPS cho bản production

Bản demo có thể chạy HTTP trên EC2. Với production nên đặt Application Load Balancer hoặc reverse proxy có TLS phía trước EC2, sử dụng domain và certificate phù hợp. Sau khi có URL HTTPS, cập nhật `CORS_ALLOWED_ORIGINS` rồi redeploy.

## 10. Checklist ảnh chụp để nộp báo cáo

- EC2 instance và Security Group.
- RDS instance, private access và RDS Security Group.
- Website đang hoạt động.
- Admin product/category/order screens.
- Swagger hoặc API response.
- CloudWatch Log Group.
- CloudWatch metrics/dashboard/alarm.
- S3 backup object nếu sử dụng.
- `docker compose ps` với container healthy.
