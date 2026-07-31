# Google account registration and sign-in

Shopsflow supports two customer registration paths:

1. Gmail + OTP + password.
2. Sign up with Google using Google Identity Services.

The Google path verifies a Google ID token on the Spring Boot backend, then creates or signs in a CUSTOMER account and returns the normal Shopsflow JWT. Admin accounts are never created or signed in through Google.

## User flow

Register page:

```text
Sign up with Google
        |
Google account chooser
        |
Google returns an ID token to React
        |
POST /api/auth/google
        |
Spring Boot verifies signature, issuer, audience, expiry, email_verified
        |
New @gmail.com -> create USER
Existing USER email -> link Google subject and sign in
Existing linked USER -> sign in
ADMIN email -> reject Google sign-in
        |
Return Shopsflow JWT + user
        |
Store auth in this tab's sessionStorage
```

Login page also contains `Sign in with Google` so accounts created by Google can sign in again without a password.

## Google Cloud setup

Create an OAuth 2.0 Client of type **Web application** in Google Cloud / Google Auth Platform.

For local development add JavaScript origins that you actually use, for example:

```text
http://localhost
http://localhost:5173
```

For production use the HTTPS origin of the deployed frontend, for example:

```text
https://shop.example.com
```

This integration uses the browser callback ID-token flow, so Shopsflow does not need a Google client secret. The same Web Client ID is used by the frontend and backend.

## Environment variables

Root `.env`:

```env
GOOGLE_CLIENT_ID=1234567890-example.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=1234567890-example.apps.googleusercontent.com
```

`GOOGLE_CLIENT_ID` is used by Spring Boot to validate the `aud` claim.

`VITE_GOOGLE_CLIENT_ID` is compiled into the React frontend and is used by Google Identity Services to render the official button.

After changing `VITE_GOOGLE_CLIENT_ID`, rebuild the frontend image.

## Database

Migration:

```text
V8__add_google_account_identity.sql
```

adds nullable `users.google_subject` and a unique index. It stores Google's stable account identifier (`sub`) rather than using email as the long-term Google identity key.

No Google access token, refresh token, client secret or Gmail password is stored.

## Account linking rules

- New verified `@gmail.com`: create a CUSTOMER and link its Google subject.
- Existing CUSTOMER with the same verified Gmail: link the Google subject and sign in.
- Existing CUSTOMER already linked to another Google subject: reject.
- Existing ADMIN email: reject Google auth; Admin must use email/password.
- Non-`@gmail.com` Google accounts: reject because this Shopsflow feature was requested specifically for Gmail accounts.

## API

```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "GOOGLE_ID_TOKEN"
}
```

Success response is the same format as password login:

```json
{
  "token": "SHOPSFLOW_JWT",
  "user": {
    "id": 12,
    "name": "Customer Name",
    "email": "customer@gmail.com",
    "phone": null,
    "role": "USER"
  }
}
```

## Local Docker

After setting the Client ID:

```powershell
docker compose down
docker compose up -d --build
docker compose ps
```

Do not use `docker compose down -v`; Flyway needs to preserve and migrate the existing PostgreSQL volume.
