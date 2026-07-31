# ShopsFlow

A REST API backend for a small e-commerce platform, built with Spring Boot 4 and PostgreSQL. Supports user authentication, product catalog with search and filtering, product reviews, shopping cart, and order management with role-based access control.

[![CI](https://github.com/namphamcse/Shopsflow/actions/workflows/ci.yml/badge.svg)](https://github.com/namphamcse/Shopsflow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)](https://adoptium.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.6-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)

---

## Features

- **JWT authentication** — stateless email/password login with BCrypt password hashing.
- **Role-based access control** — `USER` and `ADMIN` roles enforced via `@PreAuthorize` on controller methods.
- **Product catalog** — CRUD with admin-only writes; public reads support keyword search, category filter, and price range filter.
- **Product reviews** - authenticated users can create, edit, and delete their own reviews; product review lists are public.
- **Pagination & sorting** — `Pageable` parameters on the product list endpoint.
- **Shopping cart** — per-user cart with add / update / remove operations.
- **Orders** — checkout converts cart to order; users see their own orders, admins see all and can update status.
- **Bean validation** — request DTOs validated with `jakarta.validation` annotations.
- **Structured error responses** — centralized `@RestControllerAdvice` and security handlers return consistent JSON error bodies.
- **Operational readiness** — Actuator health endpoint, graceful shutdown and Docker health checks.
- **OpenAPI / Swagger UI** — interactive docs at `/swagger-ui.html`.

---

## Tech stack

| Layer       | Choice                      |
| ----------- | --------------------------- |
| Language    | Java 21                     |
| Framework   | Spring Boot 4.0.6           |
| Persistence | Spring Data JPA + Hibernate |
| Database    | PostgreSQL 16               |
| Security    | Spring Security + JJWT 0.12 |
| Build       | Maven                       |
| API docs    | springdoc-openapi 3.0       |
| Tests       | JUnit 5 + Mockito           |
| Container   | Docker / Docker Compose     |
| CI          | GitHub Actions              |

---

## Getting started

### Option A: Docker Compose

```bash
cp .env.example .env
# edit .env and set JWT_SECRET to a random string >= 32 chars
docker compose up --build
```

Both the app and Postgres start in containers. Swagger UI: <http://localhost:8080/swagger-ui.html>.

### Option B: Local development

Prerequisites: JDK 21, Maven, a running PostgreSQL instance.

```bash
cp .env.example .env
# edit .env with your DB connection details and JWT_SECRET
./mvnw spring-boot:run
```

The app reads `.env` at startup. Set:

| Variable         | Example                                      |
| ---------------- | -------------------------------------------- |
| `DB_URL`         | `jdbc:postgresql://localhost:5432/shopsflow` |
| `DB_USERNAME`    | `postgres`                                   |
| `DB_PASSWORD`    | your password                                |
| `JWT_SECRET`     | a base64-encoded random string, 32+ bytes    |
| `JWT_EXPIRATION` | `86400000` (24 hours, in ms)                 |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` |
| `APP_SEED_ADMIN_EMAIL` | initial admin email (optional) |
| `APP_SEED_ADMIN_PASSWORD` | initial admin password (optional) |

Flyway applies the database migrations and Hibernate validates the resulting schema (`ddl-auto=validate`).

---

## API overview

Full interactive docs at `/swagger-ui.html` once the app is running. Quick reference:

### Auth — `/api/auth` (public)

| Method | Path        | Description                    |
| ------ | ----------- | ------------------------------ |
| POST   | `/register` | Create a new user, returns JWT |
| POST   | `/login`    | Authenticate, returns JWT      |

### Products — `/api/products`

| Method | Path    | Auth    | Description       |
| ------ | ------- | ------- | ----------------- |
| GET    | `/`     | public  | Search and filter |
| GET    | `/{id}` | public  | Get one product   |
| POST   | `/`     | `ADMIN` | Create            |
| PUT    | `/{id}` | `ADMIN` | Update            |
| DELETE | `/{id}` | `ADMIN` | Delete            |

`GET /api/products` supports the query params `keyword`, `categoryId`, `minPrice`, `maxPrice`, plus standard `Pageable` params (`page`, `size`, `sort`).

### Reviews

| Method | Path                                | Auth   | Description                   |
| ------ | ----------------------------------- | ------ | ----------------------------- |
| GET    | `/api/products/{productId}/reviews` | public | List reviews for one product  |
| POST   | `/api/products/{productId}/reviews` | user   | Create review for one product |
| PUT    | `/api/reviews/{reviewId}`           | owner  | Edit own review               |
| DELETE | `/api/reviews/{reviewId}`           | owner  | Delete own review             |

Review requests require `stars` from `1` to `5`; `comment` is optional and limited to 2000 characters. Each user can review a product only once.

### Categories — `/api/categories`

| Method | Path    | Auth    | Description |
| ------ | ------- | ------- | ----------- |
| GET    | `/`     | public  | List all    |
| GET    | `/{id}` | public  | Get one     |
| POST   | `/`     | `ADMIN` | Create      |
| PUT    | `/{id}` | `ADMIN` | Update      |
| DELETE | `/{id}` | `ADMIN` | Delete      |

### Cart — `/api/cart` (authenticated)

| Method | Path              | Description             |
| ------ | ----------------- | ----------------------- |
| GET    | `/`               | Get current user's cart |
| POST   | `/items`          | Add product to cart     |
| PUT    | `/items/{itemId}` | Update item quantity    |
| DELETE | `/items/{itemId}` | Remove item             |

### Orders — `/api/orders` (authenticated)

| Method | Path           | Auth    | Description                 |
| ------ | -------------- | ------- | --------------------------- |
| POST   | `/`            | user    | Place order (converts cart) |
| GET    | `/`            | user    | List own orders             |
| GET    | `/{id}`        | user    | Get own order by ID         |
| PUT    | `/{id}/status` | `ADMIN` | Update order status         |
| GET    | `/all`         | `ADMIN` | List all orders             |

### Using JWTs

After register/login, send the returned token on subsequent requests:

```
Authorization: Bearer <token>
```

---

## Project structure

```
src/main/java/dev/namphamcse/shopsflow/
├── config/             # Spring configuration (SecurityConfig, OpenApiConfig, DataInitializer)
├── controller/         # REST controllers
├── dto/
│   ├── request/        # Inbound DTOs with validation
│   └── response/       # Outbound DTOs
├── entity/             # JPA entities
│   └── enums/          # Role, OrderStatus
├── exception/          # Custom exceptions + GlobalExceptionHandler
├── repository/         # Spring Data JPA repositories
├── security/           # JwtUtil, JwtFilter, UserDetailsServiceImpl
└── service/            # Business logic
```

---

## Testing

All services have Mockito unit tests (no Spring context, no database):

```bash
./mvnw test
```

Tests live in `src/test/java/dev/namphamcse/shopsflow/service/` and cover `AuthService`, `CartService`, `CategoryService`, `OrderService`, `ProductService`, and `ReviewService`.

CI runs the full test suite on every push and pull request to `main` — see `.github/workflows/ci.yml`.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
