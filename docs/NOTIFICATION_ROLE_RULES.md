# Notification role separation

Notification feeds are intentionally separated by role.

- Customer: sees only that customer's own account, cart, order, payment and review activity. VNPay/system events tied to that customer's payment flow are also shown to that customer.
- Admin: sees admin activity only, including admin sign-in/sign-out, product/category management and allowed admin order-status changes.
- Customer activity is not broadcast to admins.
- Admin activity is not broadcast to customers.
- Legacy cross-role notifications already stored in the database are filtered out by `NotificationService`.
