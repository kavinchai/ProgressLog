CREATE TABLE step_log (
    id        BIGSERIAL    PRIMARY KEY,
    user_id   BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date  DATE         NOT NULL,
    steps     INTEGER      NOT NULL,
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_step_log_user_date ON step_log(user_id, log_date);
