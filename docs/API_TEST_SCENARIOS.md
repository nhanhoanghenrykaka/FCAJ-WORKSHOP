# Kịch bản kiểm thử Shopsflow

## 1. Khởi tạo dữ liệu

Chạy project với `APP_SEED_DEMO_DATA=true`. Hệ thống tạo sẵn:

- Admin: `admin@shopsflow.com / Admin123!`
- Customer: `customer@shopsflow.com / Customer123!`
- 4 categories, 6 products và 1 sample pending order

## 2. Authentication

### TC-AUTH-01 — Đăng ký thành công

1. Mở `/register`.
2. Nhập name, email mới và password từ 8 ký tự.
3. Submit.
4. Kỳ vọng: chuyển đến login, tài khoản được tạo.

### TC-AUTH-02 — Email trùng

1. Đăng ký lại cùng email nhưng thay đổi chữ hoa/thường.
2. Kỳ vọng: nhận thông báo email đã tồn tại.

### TC-AUTH-03 — Đăng nhập và phân quyền

1. Đăng nhập customer.
2. Kỳ vọng: thấy Cart và Orders, không thấy Admin.
3. Đăng xuất và đăng nhập admin.
4. Kỳ vọng: thấy Admin workspace.

## 3. Catalog và product

### TC-PROD-01 — Tìm kiếm/lọc/sắp xếp

1. Tìm theo keyword.
2. Chọn category.
3. Nhập min/max price.
4. Đổi sort từ newest sang price ascending.
5. Kỳ vọng: URL query và dữ liệu đồng bộ, không crash khi không có kết quả.

### TC-PROD-02 — Admin tạo product

1. Admin mở tab Categories và tạo `Monitors`.
2. Mở tab Products.
3. Tạo product có name, price, stock và category vừa tạo.
4. Kỳ vọng: product xuất hiện trong table và catalog.

### TC-PROD-03 — Xóa product đã có order

1. Chọn product đã xuất hiện trong sample order.
2. Bấm Delete.
3. Kỳ vọng: backend từ chối và hướng dẫn đặt stock về `0` để bảo toàn lịch sử đơn hàng.

## 4. Cart và checkout

### TC-CART-01 — Add/update/remove

1. Customer mở product còn hàng.
2. Chọn quantity và Add to cart.
3. Mở Cart, tăng/giảm quantity.
4. Xóa item.
5. Kỳ vọng: total items và total price cập nhật đúng.

### TC-CART-02 — Vượt quá tồn kho

1. Thêm quantity lớn hơn stock.
2. Kỳ vọng: API trả conflict, UI hiển thị lỗi, stock không âm.

### TC-ORDER-01 — Place order

1. Thêm ít nhất một product vào cart.
2. Bấm Place order.
3. Kỳ vọng: cart rỗng, order mới ở trạng thái `PENDING`, stock giảm.

## 5. Order management

### TC-ORDER-02 — Customer xem order history

1. Customer mở `/orders`.
2. Kỳ vọng: chỉ thấy đơn của chính mình.

### TC-ORDER-03 — Admin xử lý đơn

1. Admin mở tab Orders.
2. Chuyển `PENDING → PAID → SHIPPED → DELIVERED`.
3. Kỳ vọng: mỗi bước thành công, terminal order không sửa tiếp được.

### TC-ORDER-04 — Hủy đơn và hoàn kho

1. Chọn đơn `PENDING` hoặc `PAID`.
2. Chuyển sang `CANCELLED`.
3. Kỳ vọng: stock của từng product trong order được cộng lại, UI inventory refresh.

## 6. Review

### TC-REV-01 — CRUD review

1. Customer mở product detail.
2. Tạo review từ 1–5 sao.
3. Sửa review.
4. Xóa review.
5. Kỳ vọng: user chỉ sửa/xóa review của mình và mỗi user chỉ review một product một lần.

## 7. Security và resilience

### TC-SEC-01 — API admin bằng user token

Gọi `POST /api/products` bằng customer token. Kỳ vọng `403` JSON.

### TC-SEC-02 — Token sai/hết hạn

Gọi protected API bằng token sai. Kỳ vọng `401`, không trả `500`.

### TC-OPS-01 — Health check

Gọi `GET /actuator/health`. Kỳ vọng `{ "status": "UP" }`.

### TC-OPS-02 — Restart

Restart backend container. Kỳ vọng Flyway validate schema, dữ liệu RDS/Postgres volume vẫn còn và frontend tự kết nối lại.
