-- ============================================================
--  V14 — Add share_calendar opt-in flag for shared workout calendar
-- ============================================================

ALTER TABLE users ADD COLUMN share_calendar BOOLEAN NOT NULL DEFAULT FALSE;
