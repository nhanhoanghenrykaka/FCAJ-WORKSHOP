# Danh sách file đã chỉnh sửa/bổ sung

## Backend chỉnh sửa

- `backend/pom.xml`
- `backend/Dockerfile`
- `backend/README.md`
- `backend/.env.example`
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-dev.properties`
- `backend/src/main/java/dev/namphamcse/shopsflow/config/DataInitializer.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/config/SecurityConfig.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/security/JwtFilter.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/security/UserDetailsServiceImpl.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/AuthService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/CategoryService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/ProductService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/OrderService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/UserRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/CategoryRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/CartItemRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/OrderItemRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/OrderRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/response/OrderResponse.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/mapper/OrderMapper.java`
- Các unit test liên quan trong `backend/src/test/java/.../service/`

## Backend bổ sung

- `backend/src/main/resources/db/migration/V3__add_indexes.sql`

## Frontend chỉnh sửa

- `frontend/src/types/index.ts`
- `frontend/src/api/storeApi.ts`
- `frontend/src/pages/Admin/Admin.tsx`
- `frontend/src/store.css`
- `frontend/README.md`

## Frontend bổ sung

- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/nginx.conf`

## Full-stack/DevOps bổ sung

- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `.github/workflows/ci.yml`
- `deploy/aws/docker-compose.aws.yml`
- `deploy/aws/.env.aws.example`
- `deploy/aws/deploy.sh`
- `deploy/aws/backup_to_s3.sh`
- `deploy/aws/cloudwatch-agent-config.json`
- `deploy/aws/README.md`
- Toàn bộ tài liệu trong thư mục `docs/`

## Cross-role notifications update (2026-07-30)

- `backend/src/main/java/dev/namphamcse/shopsflow/service/NotificationService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/AuthService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/OrderService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/ReviewService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/VnPayService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/controller/ProductController.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/controller/CategoryController.java`
- `frontend/src/components/Header.tsx`
- `frontend/src/pages/Notifications/Notifications.tsx`
- `docs/NOTIFICATION_CROSS_ROLE_RULES.md`

## Admin Reviews update
- `frontend/src/pages/Admin/Admin.tsx` - adds Reviews tab, search/filter, average rating and auto-refresh.
- `frontend/src/api/storeApi.ts` - adds admin all-reviews API and product fields to review normalization.
- `frontend/src/types/index.ts` - extends Review with product ID/name.
- `frontend/src/store.css` - styles the admin review table.
- `backend/src/main/java/dev/namphamcse/shopsflow/controller/ReviewController.java` - adds ADMIN-only all-reviews endpoint.
- `backend/src/main/java/dev/namphamcse/shopsflow/service/ReviewService.java` - lists all reviews and links notifications to the Reviews tab.
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/ReviewRepository.java` - newest-first review query.
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/response/ReviewResponse.java` - exposes product fields.
- `backend/src/main/java/dev/namphamcse/shopsflow/mapper/ReviewMapper.java` - maps product fields.
- `backend/src/test/java/dev/namphamcse/shopsflow/service/ReviewServiceTest.java` - coverage for product fields and all-review listing.
- `docs/ADMIN_REVIEWS.md` - feature notes.
