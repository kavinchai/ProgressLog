-- ============================================================
--  V4 — Add per-user nutrition goal columns to users table
-- ============================================================

ALTER TABLE users
    ADD COLUMN calorie_target_training INTEGER NOT NULL DEFAULT 2600,
    ADD COLUMN calorie_target_rest      INTEGER NOT NULL DEFAULT 2000,
    ADD COLUMN protein_target           INTEGER NOT NULL DEFAULT 180;
