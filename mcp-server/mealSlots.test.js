import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeLabel, planMealWrite } from "./mealSlots.js";

describe("normalizeLabel", () => {
	it("maps any casing of breakfast / lunch / dinner to the slot name", () => {
		assert.equal(normalizeLabel("breakfast"), "Breakfast");
		assert.equal(normalizeLabel("  LUNCH "), "Lunch");
		assert.equal(normalizeLabel("Dinner"), "Dinner");
	});

	it("keeps other meal types the user gave, capitalised", () => {
		assert.equal(normalizeLabel("snack"), "Snack");
		assert.equal(normalizeLabel("pre-workout shake"), "Pre-workout shake");
	});

	it("returns null when no meal type was given", () => {
		assert.equal(normalizeLabel(undefined), null);
		assert.equal(normalizeLabel(null), null);
		assert.equal(normalizeLabel("   "), null);
	});
});

const meal = { calories: 500, proteinGrams: 30 };

describe("planMealWrite", () => {
	const dayMeals = [
		{
			id: 5,
			mealLabel: "Breakfast",
			mealName: "Toast",
			calories: 200,
			proteinGrams: 8,
		},
		{
			id: 6,
			mealLabel: "lunch",
			mealName: "Skipped Lunch",
			calories: 0,
			proteinGrams: 0,
		},
		{
			id: 7,
			mealLabel: "Snack",
			mealName: "Bar",
			calories: 200,
			proteinGrams: 20,
		},
	];

	it("fills the day's existing breakfast slot instead of adding a meal", () => {
		const plan = planMealWrite(dayMeals, {
			...meal,
			mealLabel: "breakfast",
			mealName: "Oatmeal",
		});
		assert.equal(plan.method, "PUT");
		assert.equal(plan.mealId, 5);
		assert.deepEqual(plan.body, {
			mealLabel: "Breakfast",
			mealName: "Oatmeal",
			calories: 500,
			proteinGrams: 30,
		});
		assert.equal(plan.replaced.mealName, "Toast");
	});

	it("matches the slot label case-insensitively (a skipped lunch gets replaced)", () => {
		const plan = planMealWrite(dayMeals, {
			...meal,
			mealLabel: "Lunch",
			mealName: "Wrap",
		});
		assert.equal(plan.method, "PUT");
		assert.equal(plan.mealId, 6);
	});

	it("creates the slot when the day has no dinner yet", () => {
		const plan = planMealWrite(dayMeals, {
			...meal,
			mealLabel: "dinner",
			mealName: "Salmon",
		});
		assert.equal(plan.method, "POST");
		assert.equal(plan.body.mealLabel, "Dinner");
		assert.equal(plan.replaced, null);
	});

	it("any other meal type is always a new meal named after it", () => {
		const plan = planMealWrite(dayMeals, {
			...meal,
			mealLabel: "snack",
			mealName: "Yogurt",
		});
		assert.equal(plan.method, "POST");
		assert.equal(plan.body.mealLabel, "Snack");
		assert.equal(plan.body.mealName, "Yogurt");
	});

	it("with no meal type, creates a new unlabelled meal", () => {
		const plan = planMealWrite(dayMeals, { ...meal, mealName: "Apple" });
		assert.equal(plan.method, "POST");
		assert.equal(plan.body.mealLabel, null);
		assert.equal(plan.body.mealName, "Apple");
	});

	it("a blank food description is stored as no description", () => {
		const plan = planMealWrite([], {
			...meal,
			mealLabel: "Lunch",
			mealName: "   ",
		});
		assert.equal(plan.body.mealName, null);
	});

	it("if two meals share a slot, fills the first one (same rule as the app)", () => {
		const plan = planMealWrite(
			[
				{
					id: 1,
					mealLabel: "Dinner",
					mealName: "A",
					calories: 1,
					proteinGrams: 1,
				},
				{
					id: 2,
					mealLabel: "dinner",
					mealName: "B",
					calories: 1,
					proteinGrams: 1,
				},
			],
			{ ...meal, mealLabel: "Dinner" },
		);
		assert.equal(plan.mealId, 1);
	});

	it("handles a day with no meals and a missing food description", () => {
		const plan = planMealWrite(undefined, { ...meal, mealLabel: "Breakfast" });
		assert.equal(plan.method, "POST");
		assert.equal(plan.body.mealName, null);
	});
});

describe("planMealWrite — meal type only in the name", () => {
	const dinnerSlot = [
		{ id: 9, mealLabel: "Dinner", mealName: null, calories: 0, proteinGrams: 0 },
	];

	it("takes a leading meal type off the name and fills that slot", () => {
		const plan = planMealWrite(dinnerSlot, {
			...meal,
			mealName: "Dinner: Cava bowl",
		});
		assert.equal(plan.method, "PUT");
		assert.equal(plan.mealId, 9);
		assert.equal(plan.body.mealLabel, "Dinner");
		assert.equal(plan.body.mealName, "Cava bowl");
	});

	it("handles other separators and casing", () => {
		assert.equal(
			planMealWrite([], { ...meal, mealName: "lunch - chicken wrap" }).body
				.mealName,
			"chicken wrap",
		);
		assert.equal(
			planMealWrite([], { ...meal, mealName: "BREAKFAST" }).body.mealLabel,
			"Breakfast",
		);
		assert.equal(
			planMealWrite([], { ...meal, mealName: "Breakfast" }).body.mealName,
			null,
		);
	});

	it("uses a meal type named later in the name but keeps the name", () => {
		const plan = planMealWrite([], {
			...meal,
			mealName: "Leftover pasta for lunch",
		});
		assert.equal(plan.body.mealLabel, "Lunch");
		assert.equal(plan.body.mealName, "Leftover pasta for lunch");
	});

	it("an explicit label wins over the name", () => {
		const plan = planMealWrite([], {
			...meal,
			mealLabel: "Snack",
			mealName: "Breakfast burrito",
		});
		assert.equal(plan.body.mealLabel, "Snack");
		assert.equal(plan.body.mealName, "Breakfast burrito");
	});

	it("doesn't match a meal type inside another word", () => {
		const plan = planMealWrite([], { ...meal, mealName: "Lunchables" });
		assert.equal(plan.body.mealLabel, null);
	});

	it("an empty label falls back to the name", () => {
		const plan = planMealWrite([], {
			...meal,
			mealLabel: "",
			mealName: "Dinner — steak",
		});
		assert.equal(plan.body.mealLabel, "Dinner");
		assert.equal(plan.body.mealName, "steak");
	});
});
