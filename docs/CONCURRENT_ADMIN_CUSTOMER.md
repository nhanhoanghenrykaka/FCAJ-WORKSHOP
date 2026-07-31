# Concurrent multi-account sessions

Shopsflow now isolates authentication by browser tab.

## Storage model

Each tab stores its own JWT, user profile, and active role in `sessionStorage` only.

Keys remain role-labeled inside the tab:

- Customer: `customerAccessToken`, `customerUser`
- Admin: `adminAccessToken`, `adminUser`
- Active role: `shopsflowActiveRole`

`localStorage` is no longer used as an authentication source. Old shared auth keys are removed so a login in one tab cannot replace another tab's identity after refresh.

## Expected use

1. Tab A: sign in as Admin.
2. Tab B: sign in as Customer A.
3. Tab C: sign in as Customer B.
4. Refresh Tab A -> it is still Admin.
5. Refresh Tab B -> it is still Customer A.
6. Refresh Tab C -> it is still Customer B.
7. Signing out in one tab does not sign out or replace the account in another tab.

This works because the backend uses stateless Bearer JWT authentication and every API request reads the JWT from the current tab's session.

## Live order synchronization

Account isolation does not remove live order synchronization.

- Same browser, separate tabs: order mutations are announced through `BroadcastChannel` so another relevant tab can refetch immediately.
- Different browser/device: order views also poll the backend every 1.5 seconds while visible.
- Returning to a background tab triggers an immediate refresh.

Examples:

- Admin changes `PAID -> SHIPPED` -> Customer's order changes to `SHIPPED` and the `Delivered` button appears automatically.
- Customer confirms `SHIPPED -> DELIVERED` -> Admin order list updates automatically.
- VNPay changes an order to `PAID` -> Admin order list refreshes automatically.
