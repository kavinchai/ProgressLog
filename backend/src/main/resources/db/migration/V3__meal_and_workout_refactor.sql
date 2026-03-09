-- ============================================================
--  V3 — Meals per nutrition log; optional workout session name
-- ============================================================

-- Make workout_session name / completion_pct optional
-- (existing seed rows keep their values; new rows may omit them)
ALTER TABLE workout_session ALTER COLUMN session_name   DROP NOT NULL;
ALTER TABLE workout_session ALTER COLUMN completion_pct DROP NOT NULL;

-- Make nutrition_log calorie columns optional
-- (total will be derived from child meal rows)
ALTER TABLE nutrition_log ALTER COLUMN calories      DROP NOT NULL;
ALTER TABLE nutrition_log ALTER COLUMN protein_grams DROP NOT NULL;

-- New meal table
CREATE TABLE meal (
    id               BIGSERIAL    PRIMARY KEY,
    nutrition_log_id BIGINT       NOT NULL REFERENCES nutrition_log(id) ON DELETE CASCADE,
    meal_name        VARCHAR(100),
    calories         INTEGER      NOT NULL,
    protein_grams    INTEGER      NOT NULL
);

CREATE INDEX idx_meal_nutrition_log ON meal(nutrition_log_id);
