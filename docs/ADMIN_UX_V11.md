# Admin UX V11

This update adds the following Shopsflow behavior:

- Notification source filters hide the current role. Admin sees Customer/System; Customer sees Admin/System.
- Admin review badge is now an unread-review count. Opening a product marks that product's reviews read; admins can also mark all reviews read.
- Stock adjustment requires Category first, then Product.
- Promotions support a per-customer usage limit and enforce it at checkout.
- Stock attention counts are clickable and reveal the affected products, with shortcuts into Inventory adjustment.
- Audit Log remains a traceability history. It records who performed important actions, which entity was affected, details, and time. It is intentionally separate from notifications.

Database migration: `V11__review_read_state_and_coupon_limits.sql`.
