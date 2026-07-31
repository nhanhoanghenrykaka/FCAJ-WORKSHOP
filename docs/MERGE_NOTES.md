# Shopsflow merged build

This build uses `Shopsflow-complete-enhanced` as the stable base and ports the newer features found in the uploaded frontend/backend projects without replacing the hardened code already present in the enhanced build.

## Preserved from Shopsflow-complete-enhanced

- Admin-only workspace and admin redirect behavior.
- Admin overview dashboard, inventory health, quick actions, product/order search and filters.
- Customer-only storefront routes for non-admin users.
- Improved product cards and quick-add flow.
- Hardened JWT/CORS/error handling.
- Safe order-state transitions and stock restoration on cancellation.
- Admin order customer information.
- Flyway indexes, Actuator health endpoint, production Dockerfiles and AWS deployment files.

## Added from Shopsflow-fe-main(1)

- VNPay payment result page.
- Automatic VNPay checkout after placing an order, with graceful fallback to order history if VNPay is not configured.
- "Pay with VNPay" retry action for pending orders.
- Direct product-image upload to Cloudinary from the enhanced Admin product editor, while retaining URL input as a fallback.

## Added from Shopsflow-main(1)

- VNPay payment controller, configuration, service and HMAC utility.
- VNPay transaction ID stored on orders and returned by the API.
- Public VNPay callback endpoint while keeping checkout authenticated.
- VNPay service tests.
- Flyway migration renamed to `V4__add_vnpay_payment_fields.sql` so it does not collide with the enhanced build's `V3__add_indexes.sql`.

## Environment variables

VNPay is optional at application startup. To enable checkout, configure real Sandbox merchant credentials issued by VNPay:

```env
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_RETURN_URL=http://YOUR_PUBLIC_HOST/payment-result
VNPAY_IPN_URL=http://YOUR_PUBLIC_HOST/api/payment/vnpay/callback
VNPAY_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_USD_TO_VND_RATE=25000
```

For Cloudinary Admin uploads:

```env
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

These `VITE_` values are build-time frontend values. Rebuild the frontend container after changing them.

## AWS deployment

The variables above are wired into `deploy/aws/docker-compose.aws.yml` and documented in `deploy/aws/.env.aws.example`.

Do not commit real database passwords, JWT secrets, VNPay hash secrets, or `.env.aws`.


The storefront prices are stored/displayed in USD while VNPay accepts VND. `VNPAY_USD_TO_VND_RATE` controls the fixed conversion used by this demo. For production, manage the rate as part of the merchant pricing policy.

For local Docker, VNPay cannot reach a localhost IPN URL from its servers. The frontend therefore sends the signed VNPay return payload back to `/api/payment/vnpay/return`; the backend verifies the HMAC and amount before reconciling the order. The regular IPN callback remains enabled for public deployments.
