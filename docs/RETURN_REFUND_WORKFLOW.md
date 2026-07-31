# Return / Refund workflow

The return flow is intentionally split between customer and admin actions.

```text
DELIVERED
  -> Customer requests return -> RETURN_REQUESTED
  -> Admin approves           -> RETURN_APPROVED
  -> Customer returns item    -> RETURNED
  -> Admin confirms receipt   -> RETURN_RECEIVED
  -> Admin sends refund       -> REFUNDED
  -> Customer confirms money  -> REFUND_CONFIRMED
```

Admin can reject a request from `RETURN_REQUESTED` to `RETURN_REJECTED`.
The admin no longer has a `Mark returned` action because returning the item belongs to the customer.
Stock is restored only when the admin confirms the returned item was actually received (`RETURN_RECEIVED`).

Notifications are cross-role only: customer actions notify admins and admin actions notify the affected customer. Same-role/self actions such as sign-in, sign-out, cart changes, or an admin's own management action do not create notifications.
