import { describe, expect, it } from "vitest";
import { todayTotals } from "../utils/widget";

const GOALS = {
	calorieTargetTraining: 2600,
	calorieTargetRest: 2000,
	proteinTarget: 180,
	stepsTarget: 9000,
};

describe("todayTotals", () => {
	it("uses the training-day calorie goal by default", () => {
		expect(
			todayTotals({
				today: "2026-04-10",
				nutritionEntry: {
					dayType: "training",
					totalCalories: 1800,
					totalProtein: 120,
				},
				stepEntry: { steps: 6500 },
				goals: GOALS,
			}),
		).toEqual({
			date: "2026-04-10",
			calories: 1800,
			calorieGoal: 2600,
			protein: 120,
			proteinGoal: 180,
			steps: 6500,
			stepsGoal: 9000,
		});
	});

	it("uses the rest-day calorie goal on rest days", () => {
		const totals = todayTotals({
			today: "2026-04-10",
			nutritionEntry: { dayType: "rest", totalCalories: 900, totalProtein: 60 },
			stepEntry: null,
			goals: GOALS,
		});
		expect(totals.calorieGoal).toBe(2000);
	});

	it("is all zeros with default goals before anything is logged", () => {
		expect(
			todayTotals({
				today: "2026-04-10",
				nutritionEntry: null,
				stepEntry: null,
				goals: {},
			}),
		).toEqual({
			date: "2026-04-10",
			calories: 0,
			calorieGoal: 2000,
			protein: 0,
			proteinGoal: 150,
			steps: 0,
			stepsGoal: 10000,
		});
	});

	it("falls back to 2000 on a rest day with no rest goal set", () => {
		const totals = todayTotals({
			today: "2026-04-10",
			nutritionEntry: { dayType: "rest" },
			stepEntry: null,
			goals: { calorieTargetTraining: 2600 },
		});
		expect(totals.calorieGoal).toBe(2000);
	});
});
