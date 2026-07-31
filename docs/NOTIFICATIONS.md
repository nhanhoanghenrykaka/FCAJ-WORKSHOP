# Shopsflow notifications

## What was added

Both CUSTOMER and ADMIN accounts have a bell button in the header. The unread badge refreshes after mutations, when the browser regains focus, and every 15 seconds.

Authenticated users can open `/notifications` to:

- view notifications newest first;
- filter by All / Unread;
- filter by Customer / Admin / System source;
- open the related page from a notification;
- mark one notification as read by opening it;
- mark every notification as read.

## Activity coverage

The notification system records state-changing business activity from both roles:

### Customer activity

- account registration;
- sign in / sign out;
- add item to cart;
- change cart quantity;
- remove item from cart;
- place an order;
- start VNPay checkout;
- VNPay success / failure;
- create, edit, or delete a review;
- confirm a shipped order as delivered.

Admins receive corresponding activity notifications for these actions.

### Admin activity

- sign in / sign out;
- create, update, or delete a product;
- create, update, or delete a category;
- cancel a PENDING order;
- ship a PAID order.

Customers receive admin notifications that are relevant to them. Catalog changes are broadcast to customer accounts, and order changes go to the order owner.

Read-only actions such as opening a page, searching, or fetching data are intentionally not written as notifications. Otherwise simply opening the notification page would generate more notification events.

## Backend API

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`
- `POST /api/notifications/activity/sign-out`

## Database

Flyway migration `V5__add_notifications.sql` creates the `notifications` table and indexes.
