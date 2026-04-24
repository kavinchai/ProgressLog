-- Remove legacy columns that have been superseded by the meals table
-- (calories, protein_grams) and were never actively used (completion_pct).
ALTER TABLE nutrition_log   DROP COLUMN calories;
ALTER TABLE nutrition_log   DROP COLUMN protein_grams;
ALTER TABLE workout_session DROP COLUMN completion_pct;
