# Google sign-in BCrypt and Login layout fix

## Backend

Google-only customer accounts no longer call BCrypt to create a placeholder password.
They store a random `{google-disabled}...` marker because authentication is performed by a verified Google ID token and the local password is never used.
This removes the BCrypt 72-byte limit from the Google authentication flow.

Existing email/password customers linked to Google keep their existing BCrypt password and can continue using either sign-in method.

## Frontend

The Google sign-in control on the Login page is now placed after the Password field and before the main Sign in button.
The divider text is `or sign in with Google`.
