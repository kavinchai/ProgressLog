-- ============================================================
--  V16 — Password reset tokens
--
--  A row is created when a user requests a password reset.
--  token_hash is the SHA-256 of the random token that was
--  emailed to the user — the raw token never leaves the email.
--  expires_at is set to 5 minutes after creation. used_at is
--  stamped when the token is successfully consumed; a token
--  may only be used once.
-- ============================================================

CREATE TABLE password_reset_token (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token_user
    ON password_reset_token (user_id);
