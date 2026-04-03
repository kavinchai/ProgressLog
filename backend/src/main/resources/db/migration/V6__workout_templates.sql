CREATE TABLE workout_template (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE template_exercise (
    id            BIGSERIAL PRIMARY KEY,
    template_id   BIGINT      NOT NULL REFERENCES workout_template(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    set_number    INT         NOT NULL,
    reps          INT         NOT NULL,
    weight_lbs    NUMERIC(6,1) NOT NULL
);

CREATE INDEX idx_workout_template_user     ON workout_template(user_id);
CREATE INDEX idx_template_exercise_template ON template_exercise(template_id);
