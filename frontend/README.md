# Shopsflow Frontend

React + TypeScript + Vite frontend for the Shopsflow Spring Boot API.

## Requirements

- Node.js 20 or newer
- npm
- Shopsflow backend running on `http://localhost:8080`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api` to `http://localhost:8080`. For another backend URL, copy `.env.example` to `.env` and change `VITE_API_BASE_URL`.

## Quality checks

```bash
npm run lint
npm run build
npm audit
```

## Backend cart contract

For full cart editing, each cart item returned by the backend must include:

```json
{
  "itemId": 1,
  "productId": 10,
  "productName": "Product",
  "imageUrl": null,
  "stockQuantity": 5,
  "unitPrice": 20,
  "quantity": 1,
  "subtotal": 20
}
```

The frontend now handles an older response safely and will not call `/cart/items/undefined`, but update/remove controls require `itemId`; quantity controls also require `stockQuantity`.

## Production

```bash
npm run build
npm run preview
```

The production files are generated in `dist/` and are intentionally not included in the source ZIP.

## Docker production image

The included `Dockerfile` builds the Vite application and serves it with Nginx. Nginx also proxies `/api` to the Docker service named `backend`, allowing the full project to run as one origin.
