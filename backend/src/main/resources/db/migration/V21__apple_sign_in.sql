-- ============================================================
--  V21 — Sign in with Apple
--  apple_sub:           Apple's stable user id for a connected Apple ID
--  apple_refresh_token: lets account deletion revoke the Apple sign-in
--  password_set:        false for accounts created with Apple (their
--                       stored password is a random, unusable hash)
-- ============================================================

ALTER TABLE users ADD COLUMN apple_sub VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN apple_refresh_token VARCHAR(1024);
ALTER TABLE users ADD COLUMN password_set BOOLEAN NOT NULL DEFAULT TRUE;
