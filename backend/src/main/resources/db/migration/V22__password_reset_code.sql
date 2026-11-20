-- ============================================================
--  V22 — Password reset codes
--
--  Forgot password emails a 6-digit code. Only a hash of the code
--  is stored. A code expires after 15 minutes and is cancelled
--  after 5 wrong tries; asking again replaces it.
-- ============================================================

CREATE TABLE password_reset_code (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_code_user
    ON password_reset_code (user_id);
