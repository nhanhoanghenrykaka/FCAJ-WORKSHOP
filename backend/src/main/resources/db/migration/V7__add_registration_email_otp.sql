CREATE TABLE registration_email_verifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    otp_hash VARCHAR(100),
    expires_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    verification_token_hash VARCHAR(100),
    verified_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_registration_email_verifications_expires_at
    ON registration_email_verifications(expires_at);

CREATE INDEX idx_registration_email_verifications_verified_until
    ON registration_email_verifications(verified_until);
