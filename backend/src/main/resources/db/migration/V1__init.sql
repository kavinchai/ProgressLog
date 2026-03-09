-- ============================================================
--  V1 — Initial schema
-- ============================================================

CREATE TABLE users (
    id         BIGSERIAL    PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    email      VARCHAR(100),
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weight_log (
    id          BIGSERIAL      PRIMARY KEY,
    user_id     BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date    DATE           NOT NULL,
    weight_lbs  DECIMAL(5, 1)  NOT NULL,
    UNIQUE (user_id, log_date)
);

CREATE TABLE nutrition_log (
    id             BIGSERIAL    PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date       DATE         NOT NULL,
    calories       INTEGER      NOT NULL,
    protein_grams  INTEGER      NOT NULL,
    day_type       VARCHAR(20)  NOT NULL,   -- 'training' | 'rest'
    steps          INTEGER,
    UNIQUE (user_id, log_date)
);

CREATE TABLE workout_session (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date    DATE         NOT NULL,
    session_name    VARCHAR(100) NOT NULL,
    completion_pct  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE exercise_set (
    id             BIGSERIAL      PRIMARY KEY,
    session_id     BIGINT         NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
    exercise_name  VARCHAR(100)   NOT NULL,
    set_number     INTEGER        NOT NULL,
    reps           INTEGER        NOT NULL,
    weight_lbs     DECIMAL(6, 1)  NOT NULL,
    completed      BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_weight_log_user_date        ON weight_log(user_id, log_date);
CREATE INDEX idx_nutrition_log_user_date     ON nutrition_log(user_id, log_date);
CREATE INDEX idx_workout_session_user_date   ON workout_session(user_id, session_date);
CREATE INDEX idx_exercise_set_session        ON exercise_set(session_id);
CREATE INDEX idx_exercise_set_name           ON exercise_set(exercise_name);
