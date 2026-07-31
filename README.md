# Shopsflow — Application Development on AWS

Shopsflow is a complete full-stack e-commerce project prepared for the **Application Development on AWS** assignment.

- **Frontend:** React 19, TypeScript, Vite, Axios, React Router
- **Backend:** Java 21, Spring Boot, Spring Security, JWT, JPA, Flyway
- **Database:** PostgreSQL 16
- **Operations:** Docker Compose, health checks, CloudWatch-ready logging, AWS deployment guide

## Main functions

### Customer

- Register/sign in with JWT; each browser tab keeps its own account session.
- Browse/search/filter catalog, view product details and live stock.
- Wishlist, cart, address book and customer profile.
- Checkout with Standard/Express shipping, coupons and VNPay.
- Retry VNPay while an order remains `PENDING`.
- Order detail, tracking and lifecycle timeline.
- Confirm `SHIPPED → DELIVERED`; request a return after delivery.
- Verified-purchase product reviews.
- Notifications and support tickets.

### Administrator

- Product/category CRUD plus product-grouped customer reviews.
- Strict fulfillment: `PENDING → CANCELLED`, `PAID → SHIPPED`; delivery remains customer-controlled.
- Carrier/tracking, return/refund processing and full order detail/timeline.
- Dashboard analytics, customer summaries and top-selling products.
- Inventory history, manual adjustments and low/out-of-stock alerts.
- Promotions/coupons, support inbox and audit log.
- Cross-role notifications for business-impacting actions.

See [`docs/COMMERCE_COMPLETION_PACK.md`](docs/COMMERCE_COMPLETION_PACK.md) for the expanded workflows.

## Run the complete project with Docker

```bash
cp .env.example .env
```

Generate a JWT secret and place it in `.env`:

```bash
openssl rand -base64 48
```

Start all services:

```bash
docker compose up --build
```

Open:

- Store: `http://localhost`
- Backend health: `http://localhost/api` is proxied by Nginx; direct Actuator health is internal to the backend container
- Swagger when running the backend directly: `http://localhost:8080/swagger-ui.html`

Default local demonstration accounts when `APP_SEED_DEMO_DATA=true`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shopsflow.com` | `Admin123!` |
| Customer | `customer@shopsflow.com` | `Customer123!` |

The development seed creates categories, products and one sample pending order so the admin order screen is not empty.

## Run without Docker

### Backend

1. Start PostgreSQL and create database `shopsflow`.
2. Copy `backend/.env.example` to `backend/.env` and update values.
3. Run:

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Quality checks

```bash
cd frontend
npm run lint
npm run build

cd ../backend
./mvnw test
```

## AWS target architecture

The included deployment uses:

- **Amazon EC2** for the Nginx frontend and Spring Boot backend containers
- **Amazon RDS for PostgreSQL** for managed relational storage
- **Amazon CloudWatch** for logs, host metrics and alarms
- **AWS IAM** for least-privilege EC2 access
- **Amazon S3** as an optional destination for encrypted database backups and report artifacts

See [`deploy/aws/README.md`](deploy/aws/README.md) and [`docs/AWS_ARCHITECTURE.md`](docs/AWS_ARCHITECTURE.md).

## Project documents

- [`docs/PROPOSAL.md`](docs/PROPOSAL.md)
- [`docs/WORKSHOP_GUIDE.md`](docs/WORKSHOP_GUIDE.md)
- [`docs/BLOG_POST_DRAFT.md`](docs/BLOG_POST_DRAFT.md)
- [`docs/CHANGELOG_COMPLETION.md`](docs/CHANGELOG_COMPLETION.md)
- [`docs/FILES_CHANGED.md`](docs/FILES_CHANGED.md)
- [`docs/API_TEST_SCENARIOS.md`](docs/API_TEST_SCENARIOS.md)
- [`docs/AWS_ARCHITECTURE.md`](docs/AWS_ARCHITECTURE.md)
- [`docs/PROJECT_REPORT_DRAFT.md`](docs/PROJECT_REPORT_DRAFT.md)
- [`docs/VALIDATION.md`](docs/VALIDATION.md)
- [`docs/COMMERCE_COMPLETION_PACK.md`](docs/COMMERCE_COMPLETION_PACK.md)
- [`docs/COMMERCE_FILES_CHANGED.md`](docs/COMMERCE_FILES_CHANGED.md)
- [`docs/COMMERCE_VALIDATION.md`](docs/COMMERCE_VALIDATION.md)

## Merged VNPay + Cloudinary features

This package also includes the VNPay payment flow and Cloudinary product-image upload from the newer uploaded projects while retaining the enhanced Admin workspace and AWS hardening. See `docs/MERGE_NOTES.md` and `docs/VNPAY_INTEGRATION.md`.
