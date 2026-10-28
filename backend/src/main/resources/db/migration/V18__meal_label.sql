-- Which meal of the day this is (Breakfast / Lunch / Dinner or a user-chosen label),
-- kept separate from meal_name, which now describes what was eaten.
ALTER TABLE meal ADD COLUMN meal_label VARCHAR(50);

-- Existing meals named after a slot become that slot's label.
UPDATE meal
SET meal_label = INITCAP(LOWER(TRIM(meal_name))),
    meal_name  = NULL
WHERE LOWER(TRIM(meal_name)) IN ('breakfast', 'lunch', 'dinner');
