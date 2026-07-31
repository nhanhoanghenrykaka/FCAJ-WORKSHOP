ALTER TABLE users
ADD COLUMN google_subject VARCHAR(255);

CREATE UNIQUE INDEX uk_users_google_subject
ON users (google_subject)
WHERE google_subject IS NOT NULL;
