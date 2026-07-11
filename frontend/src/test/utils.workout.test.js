import { describe, expect, it } from "vitest";
import { groupByExercise, canonicalExerciseName } from "../utils/workout";

describe("canonicalExerciseName", () => {
	it('maps "Lat raises" to "Lateral Raises"', () => {
		expect(canonicalExerciseName("Lat raises")).toBe("Lateral Raises");
	});

	it("is case-insensitive on lookup", () => {
		expect(canonicalExerciseName("LAT RAISES")).toBe("Lateral Raises");
		expect(canonicalExerciseName("lat raises")).toBe("Lateral Raises");
	});

	it('also maps the singular "Lat raise"', () => {
		expect(canonicalExerciseName("Lat raise")).toBe("Lateral Raises");
	});

	it("returns the input unchanged for non-aliased names", () => {
		expect(canonicalExerciseName("Bench Press")).toBe("Bench Press");
	});

	it("returns null/undefined inputs unchanged", () => {
		expect(canonicalExerciseName(null)).toBe(null);
		expect(canonicalExerciseName(undefined)).toBe(undefined);
	});
});

describe("groupByExercise", () => {
	it("returns empty array for empty input", () => {
		expect(groupByExercise([])).toEqual([]);
	});

	it("returns empty array for null/undefined input", () => {
		expect(groupByExercise(null)).toEqual([]);
		expect(groupByExercise(undefined)).toEqual([]);
	});

	it("groups sets by exercise name and weight", () => {
		const sets = [
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 1, reps: 8 },
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 2, reps: 8 },
		];
		const result = groupByExercise(sets);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Bench Press");
		expect(result[0].weight).toBe(135);
		expect(result[0].sets).toHaveLength(2);
	});

	it('canonicalizes "Lat raises" so it merges with "Lateral Raises"', () => {
		const sets = [
			{ exerciseName: "Lat raises", weightLbs: "20", setNumber: 1, reps: 12 },
			{
				exerciseName: "Lateral Raises",
				weightLbs: "20",
				setNumber: 2,
				reps: 10,
			},
		];
		const result = groupByExercise(sets);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Lateral Raises");
		expect(result[0].sets).toHaveLength(2);
	});

	it("creates separate groups for same exercise at different weights", () => {
		const sets = [
			{ exerciseName: "Squat", weightLbs: "185", setNumber: 1, reps: 5 },
			{ exerciseName: "Squat", weightLbs: "225", setNumber: 1, reps: 5 },
		];
		const result = groupByExercise(sets);
		expect(result).toHaveLength(2);
		expect(result[0].weight).toBe(225); // higher weight first within same name
		expect(result[1].weight).toBe(185);
	});

	it("sorts groups alphabetically by exercise name", () => {
		const sets = [
			{ exerciseName: "Squat", weightLbs: "225", setNumber: 1, reps: 5 },
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 1, reps: 8 },
			{ exerciseName: "Deadlift", weightLbs: "315", setNumber: 1, reps: 3 },
		];
		const result = groupByExercise(sets);
		expect(result.map((g) => g.name)).toEqual([
			"Bench Press",
			"Deadlift",
			"Squat",
		]);
	});

	it("sorts sets within a group by setNumber", () => {
		const sets = [
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 3, reps: 6 },
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 1, reps: 8 },
			{ exerciseName: "Bench Press", weightLbs: "135", setNumber: 2, reps: 7 },
		];
		const result = groupByExercise(sets);
		expect(result[0].sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
	});

	it("parses weightLbs string to float", () => {
		const sets = [
			{ exerciseName: "OHP", weightLbs: "95.5", setNumber: 1, reps: 10 },
		];
		const result = groupByExercise(sets);
		expect(result[0].weight).toBe(95.5);
	});
});
