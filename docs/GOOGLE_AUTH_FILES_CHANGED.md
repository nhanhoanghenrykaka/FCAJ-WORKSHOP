# Google account auth files changed

## Backend

Added:
- `src/main/java/dev/namphamcse/shopsflow/dto/request/GoogleAuthRequest.java`
- `src/main/java/dev/namphamcse/shopsflow/service/GoogleIdentityService.java`
- `src/main/resources/db/migration/V8__add_google_account_identity.sql`

Updated:
- `src/main/java/dev/namphamcse/shopsflow/controller/AuthController.java`
- `src/main/java/dev/namphamcse/shopsflow/service/AuthService.java`
- `src/main/java/dev/namphamcse/shopsflow/entity/User.java`
- `src/main/java/dev/namphamcse/shopsflow/repository/UserRepository.java`
- `src/main/resources/application.properties`
- `src/test/java/dev/namphamcse/shopsflow/service/AuthServiceTest.java`
- `pom.xml`
- `.env.example`
- `docker-compose.yml`

## Frontend

Added:
- `src/components/GoogleSignInButton.tsx`
- `src/components/GoogleSignInButton.css`

Updated:
- `src/api/authApi.ts`
- `src/pages/Register/Register.tsx`
- `src/pages/Register/Register.css`
- `src/pages/Login/Login.tsx`
- `Dockerfile`
- `.env.example`
- `nginx.conf`

## Root / AWS

Updated:
- `.env.example`
- `docker-compose.yml`
- `deploy/aws/.env.aws.example`
- `deploy/aws/docker-compose.aws.yml`
