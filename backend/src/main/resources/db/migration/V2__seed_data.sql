-- ============================================================
--  V2 — Seed data
--  Default credentials: username=kavin  password=password
--  Hash below is BCrypt(10) for "password".
--  Regenerate with: new BCryptPasswordEncoder().encode("yourpassword")
-- ============================================================

-- NOTE: 2026 is NOT a leap year (Feb has 28 days).
--  The date 2026-02-29 in the source data is invalid and has been
--  excluded from this migration. Adjust these entries as needed.

INSERT INTO users (username, password, email) VALUES
    ('kavin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'kavin@example.com');

-- ── Weight log ────────────────────────────────────────────────────────────
INSERT INTO weight_log (user_id, log_date, weight_lbs) VALUES
    (1, '2026-02-25', 149.0),
    (1, '2026-02-26', 148.4),
    (1, '2026-02-27', 147.6),
    (1, '2026-02-28', 148.2),
    -- 2026-02-29 excluded (not a leap year)
    (1, '2026-03-01', 151.5),
    (1, '2026-03-02', 150.4),
    (1, '2026-03-03', 152.3),
    (1, '2026-03-04', 149.6),
    (1, '2026-03-05', 150.4),
    (1, '2026-03-06', 151.5),
    (1, '2026-03-07', 150.5),
    (1, '2026-03-08', 151.9);

-- ── Nutrition log ─────────────────────────────────────────────────────────
INSERT INTO nutrition_log (user_id, log_date, calories, protein_grams, day_type, steps) VALUES
    (1, '2026-02-25', 2665, 188, 'training', NULL),
    (1, '2026-02-26', 1975, 173, 'training', NULL),
    (1, '2026-02-27', 3130, 192, 'rest',     NULL),
    (1, '2026-02-28', 2510, 192, 'training', NULL),
    -- 2026-02-29 excluded (not a leap year)
    (1, '2026-03-01', 3230, 175, 'training', 16288),
    (1, '2026-03-02', 2820, 198, 'rest',     19000),
    (1, '2026-03-03', 2580, 177, 'training',  9162),
    (1, '2026-03-04', 2655, 178, 'training',  7586),
    (1, '2026-03-05', 2430, 177, 'rest',     15104),
    (1, '2026-03-06', 1885, 142, 'training',  5470),
    (1, '2026-03-07', 2605, 144, 'rest',      8139);

-- ── Workout sessions ──────────────────────────────────────────────────────
INSERT INTO workout_session (user_id, session_date, session_name, completion_pct) VALUES
    (1, '2026-02-25', 'Push',          85),   -- id 1
    (1, '2026-02-26', 'Pull',          90),   -- id 2
    (1, '2026-02-28', 'Legs',          75),   -- id 3
    -- 2026-02-29 excluded (not a leap year)
    (1, '2026-03-01', 'Pull',         100),   -- id 4
    (1, '2026-03-02', 'Rest/Accessory',100),  -- id 5
    (1, '2026-03-03', 'Push',          65),   -- id 6
    (1, '2026-03-04', 'Pull',          50),   -- id 7
    (1, '2026-03-05', 'Pull Makeup',  100),   -- id 8
    (1, '2026-03-06', 'Legs',          70),   -- id 9
    (1, '2026-03-07', 'Upper',          0),   -- id 10  (skipped)
    (1, '2026-03-08', 'Upper Makeup',  70);   -- id 11

-- ── Exercise sets ─────────────────────────────────────────────────────────

-- 2026-02-25 Push — Bench Press (early: 6/6/6/5/3) + Incline DB (45 lbs)
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (1, 'Bench Press',      1, 6, 135.0, TRUE),
    (1, 'Bench Press',      2, 6, 135.0, TRUE),
    (1, 'Bench Press',      3, 6, 135.0, TRUE),
    (1, 'Bench Press',      4, 5, 135.0, TRUE),
    (1, 'Bench Press',      5, 3, 135.0, TRUE),
    (1, 'Incline DB Press', 1, 8, 45.0,  TRUE),
    (1, 'Incline DB Press', 2, 8, 45.0,  TRUE),
    (1, 'Incline DB Press', 3, 7, 45.0,  TRUE),
    (1, 'Incline DB Press', 4, 6, 45.0,  TRUE);

-- 2026-02-26 Pull — Lat Pulldowns @ 84 lbs
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (2, 'Lat Pulldowns', 1, 10, 84.0, TRUE),
    (2, 'Lat Pulldowns', 2, 10, 84.0, TRUE),
    (2, 'Lat Pulldowns', 3,  9, 84.0, TRUE),
    (2, 'Lat Pulldowns', 4,  8, 84.0, TRUE);

-- 2026-02-28 Legs — Squats & RDL @ 105 lbs
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (3, 'Squats', 1, 6, 105.0, TRUE),
    (3, 'Squats', 2, 6, 105.0, TRUE),
    (3, 'Squats', 3, 6, 105.0, TRUE),
    (3, 'Squats', 4, 5, 105.0, TRUE),
    (3, 'Romanian Deadlifts', 1, 8, 105.0, TRUE),
    (3, 'Romanian Deadlifts', 2, 8, 105.0, TRUE),
    (3, 'Romanian Deadlifts', 3, 7, 105.0, TRUE);

-- 2026-03-01 Pull — Lat Pulldowns @ 96 lbs (+12)
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (4, 'Lat Pulldowns', 1, 10, 96.0, TRUE),
    (4, 'Lat Pulldowns', 2, 10, 96.0, TRUE),
    (4, 'Lat Pulldowns', 3, 10, 96.0, TRUE),
    (4, 'Lat Pulldowns', 4,  9, 96.0, TRUE);

-- 2026-03-03 Push — Bench Press mid progression + Incline DB @ 50 lbs
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (6, 'Bench Press',      1, 7, 135.0, TRUE),
    (6, 'Bench Press',      2, 6, 135.0, TRUE),
    (6, 'Bench Press',      3, 6, 135.0, TRUE),
    (6, 'Bench Press',      4, 5, 135.0, TRUE),
    (6, 'Incline DB Press', 1, 8, 50.0,  TRUE),
    (6, 'Incline DB Press', 2, 8, 50.0,  TRUE),
    (6, 'Incline DB Press', 3, 6, 50.0,  TRUE);

-- 2026-03-04 Pull — partial (50%)
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (7, 'Lat Pulldowns', 1, 10, 96.0, TRUE),
    (7, 'Lat Pulldowns', 2,  8, 96.0, TRUE);

-- 2026-03-05 Pull Makeup — Lat Pulldowns @ 108 lbs (+12, total +24 lbs)
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (8, 'Lat Pulldowns', 1, 10, 108.0, TRUE),
    (8, 'Lat Pulldowns', 2, 10, 108.0, TRUE),
    (8, 'Lat Pulldowns', 3, 10, 108.0, TRUE),
    (8, 'Lat Pulldowns', 4,  9, 108.0, TRUE);

-- 2026-03-06 Legs — Squats & RDL @ 115 lbs (+10)
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (9, 'Squats', 1, 6, 115.0, TRUE),
    (9, 'Squats', 2, 6, 115.0, TRUE),
    (9, 'Squats', 3, 5, 115.0, TRUE),
    (9, 'Romanian Deadlifts', 1, 8, 115.0, TRUE),
    (9, 'Romanian Deadlifts', 2, 7, 115.0, TRUE),
    (9, 'Romanian Deadlifts', 3, 7, 115.0, TRUE);

-- 2026-03-07 Upper — skipped (0%) — no sets

-- 2026-03-08 Upper Makeup — Bench Press now 7/6/6/6/5 + 145 lbs attempt
INSERT INTO exercise_set (session_id, exercise_name, set_number, reps, weight_lbs, completed) VALUES
    (11, 'Bench Press', 1, 7, 135.0, TRUE),
    (11, 'Bench Press', 2, 6, 135.0, TRUE),
    (11, 'Bench Press', 3, 6, 135.0, TRUE),
    (11, 'Bench Press', 4, 6, 135.0, TRUE),
    (11, 'Bench Press', 5, 5, 135.0, TRUE),
    (11, 'Bench Press', 6, 3, 145.0, FALSE);  -- attempted 145 lbs, not completed
