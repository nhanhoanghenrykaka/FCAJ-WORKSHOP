# Gmail OTP registration - files changed

## Backend added

- `backend/src/main/java/dev/namphamcse/shopsflow/entity/RegistrationEmailVerification.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/repository/RegistrationEmailVerificationRepository.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/RegistrationOtpService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/request/SendRegistrationOtpRequest.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/request/VerifyRegistrationOtpRequest.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/response/SendRegistrationOtpResponse.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/response/VerifyRegistrationOtpResponse.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/exception/ExternalServiceException.java`
- `backend/src/main/resources/db/migration/V7__add_registration_email_otp.sql`

## Backend updated

- `backend/pom.xml`
- `backend/src/main/resources/application.properties`
- `backend/src/main/java/dev/namphamcse/shopsflow/controller/AuthController.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/service/AuthService.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/dto/request/RegisterRequest.java`
- `backend/src/main/java/dev/namphamcse/shopsflow/exception/GlobalExceptionHandler.java`
- `backend/src/test/java/dev/namphamcse/shopsflow/service/AuthServiceTest.java`
- `backend/.env.example`
- `backend/docker-compose.yml`

## Frontend updated

- `frontend/src/api/authApi.ts`
- `frontend/src/pages/Register/Register.tsx`
- `frontend/src/pages/Register/Register.css`

## Deployment updated

- `.env.example`
- `docker-compose.yml`
- `deploy/aws/.env.aws.example`
- `deploy/aws/docker-compose.aws.yml`
