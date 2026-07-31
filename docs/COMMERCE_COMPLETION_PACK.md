# Shopsflow Commerce Completion Pack

This package extends the existing Shopsflow storefront/admin app without removing the existing VNPay, notification, tab-isolated authentication, admin reviews-by-product, and live order-sync behavior.

## Customer features

- Profile management (name and phone; email stays immutable while signed in so the JWT identity remains valid).
- Address book with default delivery address.
- Wishlist / saved products.
- Checkout with address snapshot, Standard/Express shipping and coupons.
- Order detail page with items, totals, shipping, carrier/tracking and lifecycle timeline.
- VNPay retry for a pending order after a failed/cancelled payment attempt.
- Customer-only delivery confirmation: `SHIPPED -> DELIVERED`.
- Return request after delivery, with admin-managed return/refund workflow.
- Verified-purchase reviews: a customer can review only after receiving a product in an order.
- Customer support tickets and replies.

## Admin features

- Operations dashboard with revenue, orders, customers, average rating, top-selling products and stock alerts.
- Customer summary table (orders, spend, reviews, join date).
- Inventory transaction history and manual stock adjustment.
- Low-stock/out-of-stock notifications.
- Coupon/promotion creation and management.
- Shipping carrier and tracking number when moving `PAID -> SHIPPED`.
- Return workflow: approve/reject, mark returned, mark refunded.
- Support inbox and replies.
- Audit log for important customer/admin/system actions.
- Existing review workspace remains grouped by product/category.

## Order ownership and status rules

- VNPay: `PENDING -> PAID`.
- Admin: `PENDING -> CANCELLED` and `PAID -> SHIPPED`.
- Customer: `SHIPPED -> DELIVERED`.
- Customer: `DELIVERED -> RETURN_REQUESTED` (and can re-request after a rejection).
- Admin return flow: `RETURN_REQUESTED -> RETURN_APPROVED | RETURN_REJECTED`, `RETURN_APPROVED -> RETURNED`, `RETURNED -> REFUNDED`.
- Admin cannot move `SHIPPED` back to `PAID` or confirm delivery for the customer.

## Database

Flyway migration `V6__complete_commerce_features.sql` adds addresses, wishlist, order timeline, inventory movements, coupons, support, audit logs, shipping/tracking/discount fields and the return/refund statuses.

Do not use `docker compose down -v` during a normal update because `-v` removes the PostgreSQL volume.

## Main routes

Customer:
- `/account`
- `/cart`
- `/orders`
- `/orders/:id`
- `/support`
- `/notifications`

Admin:
- `/admin`
- `/admin/operations`
- `/admin/orders/:id`
- `/notifications`

## Build after replacing source

```bash
docker compose down
docker compose up -d --build
docker compose ps
```

The first backend start after this upgrade runs Flyway V6 automatically.
