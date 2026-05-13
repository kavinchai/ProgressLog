-- ============================================================
--  V12 — Add share_data opt-in flag for public leaderboards
-- ============================================================

ALTER TABLE users ADD COLUMN share_data BOOLEAN NOT NULL DEFAULT FALSE;
