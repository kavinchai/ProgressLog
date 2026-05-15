-- ============================================================
--  V13 — Deletion journal for soft-delete / undo support
--
--  Every destructive operation (delete_workout, delete_exercise,
--  delete_meal, delete_steps, delete_weight, delete_nutrition_log)
--  snapshots the affected data here before performing the actual
--  delete. POST /api/undo replays the most recent un-restored
--  entry for the user. A scheduled job purges entries older than
--  30 days.
-- ============================================================

CREATE TABLE deletion_journal (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type  VARCHAR(50)  NOT NULL,
    summary      VARCHAR(255) NOT NULL,
    snapshot     TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    restored_at  TIMESTAMPTZ
);

-- Lookup the most recent un-restored entry for a user.
CREATE INDEX idx_deletion_journal_user_pending
    ON deletion_journal (user_id, created_at DESC)
    WHERE restored_at IS NULL;

-- Used by the purge job.
CREATE INDEX idx_deletion_journal_created_at
    ON deletion_journal (created_at);
