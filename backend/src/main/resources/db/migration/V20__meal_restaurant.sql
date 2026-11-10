-- Where a meal came from (e.g. "Chipotle", "Home cooked"). Nullable: existing
-- meals stay blank.
ALTER TABLE meal ADD COLUMN restaurant VARCHAR(100);
