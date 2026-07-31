# Shopsflow UX/Admin completion - 2026-07-30

This upgrade keeps the existing tab-isolated authentication, Google/Gmail authentication, VNPay flow, notifications, reviews, and order-status ownership rules while adding the requested support/admin/checkout improvements.

## Implemented

1. Support tickets now select Category -> Product. The selected product/category is stored on the ticket and shown to admins.
2. Customer and Admin profiles can save a profile image URL uploaded through the existing Cloudinary configuration.
3. Admin Support is a paginated ticket table. Chat/reply controls open only after selecting a ticket.
4. Admin header active state is exclusive: `/admin` uses exact matching, so Operations no longer underlines both menu items.
5. Admin can ban/unban customer accounts with a reason. Banned customers are rejected by password and Google sign-in with `Tài khoản của bạn đã bị cấm.` Existing JWTs are no longer authenticated after the account is banned.
6. Coupons can target all customers or selected customers. Availability and validation are enforced by the backend.
7. Shipping is customer-selected only: STANDARD = free, EXPRESS = $4. Admin no longer enters carrier/tracking prompts when marking an order SHIPPED.
8. Checkout loads coupons available to the signed-in customer and provides a selector before manual coupon entry/apply.
9. Pagination was added to major long lists: Admin products, categories, orders, review products, customers, inventory history, promotions, returns, support tickets, audit log; Customer orders, support tickets, and notifications.

## Database migration

`backend/src/main/resources/db/migration/V9__support_profiles_bans_targeted_coupons.sql`

Adds:
- customer/admin profile image field
- customer ban state/reason/timestamp
- support product/category references
- targeted coupon audience + recipient join table

Flyway applies V9 automatically when the backend starts. Do not delete the existing database volume just to apply this migration.

## Cloudinary

Profile image upload reuses:

```env
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

## Order ownership rules preserved

- VNPay: `PENDING -> PAID`
- Admin: `PENDING -> CANCELLED`, `PAID -> SHIPPED`
- Customer: `SHIPPED -> DELIVERED`

Admin cannot move `SHIPPED -> PAID` or confirm delivery for the customer.
