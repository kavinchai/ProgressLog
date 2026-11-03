-- ============================================================
--  V19 — Add per-user daily steps goal to users table
-- ============================================================

ALTER TABLE users ADD COLUMN steps_target INTEGER NOT NULL DEFAULT 10000;
