import { describe, expect, it } from "vitest";
import { getWeek, getCurrentWeek } from "../utils/date";
import {
	datesBetween,
	summarize,
	weeklyAverages,
	workoutCountsByDate,
	shadeAlpha,
} from "../utils/history";

// Wed Oct 28 2026
const WED = new Date(2026, 9, 28, 12);

describe("getWeek", () => {
	it("returns Sunday → Saturday of the current week for offset 0", () => {
		expect(getWeek(0, WED)).toEqual([
			"2026-10-25",
			"2026-10-26",
			"2026-10-27",
			"2026-10-28",
			"2026-10-29",
			"2026-10-30",
			"2026-10-31",
		]);
	});

	it("steps back a whole week per negative offset, across month boundaries", () => {
		const w = getWeek(-4, WED);
		expect(w[0]).toBe("2026-09-27");
		expect(w[6]).toBe("2026-10-03");
	});

	it("getCurrentWeek is week offset 0", () => {
		expect(getCurrentWeek()).toEqual(getWeek(0));
	});
});

describe("datesBetween", () => {
	it("lists every date inclusive, ascending", () => {
		expect(datesBetween("2026-02-27", "2026-03-02")).toEqual([
			"2026-02-27",
			"2026-02-28",
			"2026-03-01",
			"2026-03-02",
		]);
	});

	it("returns an empty list when start is after end", () => {
		expect(datesBetween("2026-03-02", "2026-03-01")).toEqual([]);
	});
});

describe("summarize", () => {
	it("averages logged values, ignores missing ones and counts workouts", () => {
		const rows = [
			{
				weight: 180,
				calories: 2000,
				protein: 150,
				steps: 8000,
				workout: "Push",
			},
			{
				weight: 178,
				calories: null,
				protein: null,
				steps: 12000,
				workout: null,
			},
			{
				weight: null,
				calories: 3000,
				protein: 170,
				steps: null,
				workout: "Legs",
			},
		];
		expect(summarize(rows)).toEqual({
			weight: 179,
			calories: 2500,
			protein: 160,
			steps: 10000,
			workouts: 2,
		});
	});

	it("returns nulls when nothing was logged", () => {
		expect(
			summarize([
				{
					weight: null,
					calories: null,
					protein: null,
					steps: null,
					workout: null,
				},
			]),
		).toEqual({
			weight: null,
			calories: null,
			protein: null,
			steps: null,
			workouts: 0,
		});
	});
});

describe("weeklyAverages", () => {
	it("groups days into Sunday-start weeks and averages the logged values", () => {
		const rows = [
			{ date: "2026-10-18", calories: 2000 }, // Sun
			{ date: "2026-10-20", calories: 3000 },
			{ date: "2026-10-24", calories: null }, // Sat, not logged
			{ date: "2026-10-25", calories: 2500 }, // next Sun
		];
		expect(weeklyAverages(rows, "calories")).toEqual([
			{ weekStart: "2026-10-18", value: 2500 },
			{ weekStart: "2026-10-25", value: 2500 },
		]);
	});

	it("keeps a week with no logged values as null so gaps stay visible", () => {
		const rows = [
			{ date: "2026-10-11", calories: null },
			{ date: "2026-10-18", calories: 2000 },
		];
		expect(weeklyAverages(rows, "calories")).toEqual([
			{ weekStart: "2026-10-11", value: null },
			{ weekStart: "2026-10-18", value: 2000 },
		]);
	});
});

describe("workoutCountsByDate", () => {
	it("counts sessions per date", () => {
		const counts = workoutCountsByDate([
			{ sessionDate: "2026-10-20" },
			{ sessionDate: "2026-10-20" },
			{ sessionDate: "2026-10-21" },
		]);
		expect(counts.get("2026-10-20")).toBe(2);
		expect(counts.get("2026-10-21")).toBe(1);
		expect(counts.get("2026-10-22")).toBeUndefined();
	});
});

describe("shadeAlpha", () => {
	it("scales from a faint tint to strong as the value approaches the goal", () => {
		expect(shadeAlpha(0, 2000)).toBeCloseTo(0.12);
		expect(shadeAlpha(1000, 2000)).toBeCloseTo(0.51);
		expect(shadeAlpha(2000, 2000)).toBeCloseTo(0.9);
	});

	it("caps above the goal and returns null when there is no value", () => {
		expect(shadeAlpha(5000, 2000)).toBeCloseTo(0.9);
		expect(shadeAlpha(null, 2000)).toBeNull();
	});
});
