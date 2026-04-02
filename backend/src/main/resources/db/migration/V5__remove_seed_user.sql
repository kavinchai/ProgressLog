-- Remove the default seed user (kavin / "password") and all associated data.
-- This data was only meant for local development.

DELETE FROM exercise_set
WHERE session_id IN (SELECT id FROM workout_session WHERE user_id = 1);

DELETE FROM workout_session WHERE user_id = 1;
DELETE FROM nutrition_log  WHERE user_id = 1;
DELETE FROM weight_log     WHERE user_id = 1;
DELETE FROM users          WHERE id = 1 AND username = 'kavin';
