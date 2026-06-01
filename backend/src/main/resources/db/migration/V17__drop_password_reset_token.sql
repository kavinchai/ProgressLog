-- ============================================================
--  V17 — Drop password reset tokens
--
--  The email-based forgot-password feature was removed. This
--  forward migration drops the password_reset_token table
--  introduced in V16. Dropping the table also removes its
--  idx_password_reset_token_user index.
-- ============================================================

DROP TABLE IF EXISTS password_reset_token;
