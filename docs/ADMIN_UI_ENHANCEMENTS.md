# Shopsflow Admin UI Enhancements

## What changed

### Admin-only experience
- ADMIN login redirects directly to `/admin`.
- ADMIN accounts no longer see Home, Catalog, Orders, catalog search, or cart controls in the top navigation.
- ADMIN header contains only `Run the shop` and the account menu.
- Customer storefront routes redirect an authenticated ADMIN back to `/admin`.
- Storefront footer is hidden for ADMIN accounts.

### Admin workspace
- New Overview tab shown by default.
- Six operational KPIs: products, open orders, low stock, out of stock, delivered revenue, inventory value.
- Quick actions for product, category, and order management.
- Inventory health panel highlighting low/out-of-stock products.
- Fulfillment queue for pending/paid orders.
- Recent order activity table.
- Product search and stock filters.
- Order search and status filters.
- Category rows show assigned product counts.
- Low-stock styling added to inventory.

### Storefront improvements
- Product cards show a New badge for products created in the last 30 days.
- Low stock displays `Only N left`.
- Quick Add adds one unit directly from product cards for signed-in customers.
- Guests using Quick Add are sent to sign in first.

## Changed frontend files
- `frontend/src/App.tsx`
- `frontend/src/routes/CustomerRoute.tsx` (new)
- `frontend/src/components/common/Logo.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Header.css`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/pages/Login/Login.tsx`
- `frontend/src/pages/Admin/Admin.tsx`
- `frontend/src/components/common/ProductCard.tsx`
- `frontend/src/store.css`

## Redeploy after changing frontend/backend

From the EC2 project deployment directory:

```bash
cd ~/shopsflow-source/Shopsflow-complete/deploy/aws
./deploy.sh
```

If the source on EC2 was replaced with this enhanced package, preserve the existing `.env.aws` before replacing the project directory.

Frontend-only rebuild:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml build frontend
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d --no-deps frontend
```

Backend-only rebuild:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml build backend
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d --no-deps backend
```

Full clean rebuild when Docker cache causes stale output:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml build --no-cache
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d
```

Verify:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml ps
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/api/products
```
