# Gmail OTP registration

Customer registration now requires ownership verification of an `@gmail.com` address before the account is created.

## User flow

1. Customer enters a Gmail address.
2. Customer presses `Send OTP`.
3. Backend generates a random 6-digit OTP and emails it to that Gmail address.
4. Customer enters the OTP and presses `Verify OTP`.
5. Backend validates the OTP and returns a short-lived registration verification token.
6. Only a registration request containing that valid verification token can create the customer account.

The default rules are:

- OTP lifetime: 5 minutes.
- Resend cooldown: 60 seconds.
- Maximum incorrect attempts: 5.
- Verified registration token lifetime: 15 minutes.
- Registration addresses must end in `@gmail.com`.

OTP values are not stored as plaintext. The database stores a BCrypt hash of the OTP, and the registration proof token is stored only as a SHA-256 hash.

## Backend endpoints

### Send OTP

`POST /api/auth/register/otp/send`

```json
{
  "email": "customer@gmail.com"
}
```

### Verify OTP

`POST /api/auth/register/otp/verify`

```json
{
  "email": "customer@gmail.com",
  "otp": "123456"
}
```

The response contains a short-lived `verificationToken` used by the final registration request.

### Register

`POST /api/auth/register`

```json
{
  "name": "Customer Name",
  "email": "customer@gmail.com",
  "password": "Customer123!",
  "verificationToken": "token-returned-after-valid-otp"
}
```

The backend refuses registration when Gmail verification is missing, invalid, expired or belongs to another email address.

## Gmail SMTP configuration

Copy `.env.example` to `.env` and configure the sender mailbox:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-shop-email@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_FROM=your-shop-email@gmail.com

REGISTRATION_OTP_EXPIRATION_MINUTES=5
REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS=60
REGISTRATION_OTP_MAX_ATTEMPTS=5
REGISTRATION_VERIFICATION_VALID_MINUTES=15
```

Do not commit the real `MAIL_PASSWORD` to Git.

For Gmail SMTP, use an App Password for the sender account instead of putting the normal Google Account password in the application configuration.

## Database

Flyway migration:

`V7__add_registration_email_otp.sql`

Table:

`registration_email_verifications`

It stores only verification state, hashes, timestamps and attempt counters. The row is removed after successful account registration.

## Docker

After configuring `.env`:

```powershell
docker compose down
docker compose up -d --build
docker compose ps
```

Do not use `docker compose down -v` unless the database volume is intentionally being deleted.
