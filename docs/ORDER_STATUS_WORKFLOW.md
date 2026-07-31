# Order status workflow

## Responsibility rules

- VNPay: `PENDING -> PAID` after a valid successful payment callback/return.
- Admin: `PENDING -> CANCELLED`.
- Admin: `PAID -> SHIPPED`.
- Customer: `SHIPPED -> DELIVERED` by pressing **Delivered** on the Orders page.
- No reverse transitions are permitted.

## API

- Admin status update: `PUT /api/orders/{id}/status`
- Customer delivery confirmation: `PUT /api/orders/{id}/delivered`

The backend enforces these rules, so changing the frontend request manually cannot bypass the workflow.
