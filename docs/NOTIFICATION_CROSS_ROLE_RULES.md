# Cross-role notification rules

Notifications are stored per recipient. A user can see own activity plus activity from the other role when it changes data or screens relevant to that user.

## Customer -> Admin
- New customer registration
- New order placed
- VNPay payment success or failure/cancellation
- Review created, edited or deleted
- Customer confirms a SHIPPED order as DELIVERED

Cart changes, sign-in/sign-out and starting VNPay checkout remain customer-only because they do not yet change admin business data.

## Admin -> Customer
- Order PENDING -> CANCELLED for that customer
- Order PAID -> SHIPPED for that customer
- Product created, updated or deleted (all customers)
- Category created, updated or deleted (all customers)

## Same-role activity
Existing own-role notifications remain enabled, so admins still see admin management activity and customers still see their own account/cart/order/payment/review activity.

## UI refresh
The notification page and bell badge re-fetch periodically so cross-tab and cross-device changes appear without manual refresh.
