import { describe, expect, it } from "vitest";
import {
	computeAchievements,
	equivalentFor,
	liftFor,
	newlyEarned,
	workoutVolume,
} from "../utils/achievements";

const set = (exerciseName, weightLbs, reps) => ({
	exerciseName,
	weightLbs,
	reps,
});
const workout = (sessionDate, sets, sessionName = null) => ({
	id: sessionDate,
	sessionDate,
	sessionName,
	exerciseSets: sets,
});

const compute = (overrides = {}) =>
	computeAchievements({
		workouts: [],
		nutrition: [],
		steps: [],
		proteinGoal: 150,
		today: "2026-11-18",
		...overrides,
	});

const badge = (result, id) => result.allBadges.find((b) => b.id === id);

describe("workoutVolume", () => {
	it("adds weight × reps over every set", () => {
		expect(
			workoutVolume(
				workout("2026-11-18", [
					set("Bench Press", 200, 5),
					set("Bench Press", 200, 4),
					set("Pull-ups", 0, 10),
				]),
			),
		).toBe(1800);
	});

	it("skips sets with no weight or reps", () => {
		expect(
			workoutVolume(
				workout("2026-11-18", [
					set("Squat", null, 5),
					set("Squat", 225, null),
				]),
			),
		).toBe(0);
	});
});

describe("equivalentFor", () => {
	it("picks the heaviest milestone the weight reaches", () => {
		expect(equivalentFor(13630).id).toBe("elephant");
		expect(equivalentFor(4000).id).toBe("car");
	});

	it("has nothing under the lightest milestone", () => {
		expect(equivalentFor(500)).toBeNull();
	});
});

describe("liftFor", () => {
	it("recognises the barbell bench, squat and deadlift by common names", () => {
		expect(liftFor("Bench Press")).toBe("bench");
		expect(liftFor("barbell bench press")).toBe("bench");
		expect(liftFor("Squats")).toBe("squat");
		expect(liftFor("Back Squat")).toBe("squat");
		expect(liftFor("Deadlifts")).toBe("deadlift");
	});

	it("leaves out variations", () => {
		expect(liftFor("Incline Bench Press")).toBeNull();
		expect(liftFor("Dumbbell Bench Press")).toBeNull();
		expect(liftFor("Front Squat")).toBeNull();
		expect(liftFor("Romanian Deadlifts")).toBeNull();
	});
});

describe("computeAchievements — lifetime volume", () => {
	it("totals every workout and dates each milestone it passed", () => {
		const result = compute({
			workouts: [
				workout("2026-11-01", [set("Squat", 200, 5)]), // 1,000
				workout("2026-11-10", [set("Squat", 300, 10)]), // 3,000 → 4,000
			],
		});
		expect(result.volume.total).toBe(4000);
		const [piano, car, elephant] = result.volume.milestones;
		expect(piano).toMatchObject({ id: "piano", earnedOn: "2026-11-01" });
		expect(car).toMatchObject({ id: "car", earnedOn: "2026-11-10" });
		expect(elephant.earnedOn).toBeNull();
		expect(elephant.progress).toBeCloseTo(4000 / 13000);
		expect(result.volume.next.id).toBe("elephant");
	});

	it("names the biggest workout and this month's total", () => {
		const result = compute({
			workouts: [
				workout("2026-10-30", [set("Squat", 300, 10)], "Legs"),
				workout("2026-11-02", [set("Bench Press", 100, 10)]),
				workout("2026-11-05", [set("Bench Press", 100, 5)]),
			],
		});
		expect(result.volume.biggest).toMatchObject({
			volume: 3000,
			date: "2026-10-30",
			name: "Legs",
		});
		expect(result.volume.thisMonth).toEqual({ volume: 1500, workouts: 2 });
	});
});

describe("computeAchievements — plate clubs", () => {
	it("earns a club on the first set at or over its weight", () => {
		const result = compute({
			workouts: [
				workout("2026-09-02", [set("Deadlift", 225, 5)]),
				workout("2026-11-18", [set("Deadlifts", 315, 1)]),
			],
		});
		expect(badge(result, "deadlift-2")).toMatchObject({
			earnedOn: "2026-09-02",
		});
		expect(badge(result, "deadlift-3")).toMatchObject({
			earnedOn: "2026-11-18",
		});
		expect(badge(result, "deadlift-4")).toMatchObject({
			earnedOn: null,
			current: 315,
			target: 405,
		});
	});

	it("ignores variations of the lift", () => {
		const result = compute({
			workouts: [workout("2026-11-18", [set("Incline Bench Press", 135, 8)])],
		});
		expect(badge(result, "bench-1").earnedOn).toBeNull();
	});

	it("shows each lift's highest club and the next one", () => {
		const result = compute({
			workouts: [workout("2026-11-18", [set("Squat", 275, 5)])],
		});
		const shown = result.groups
			.find((g) => g.id === "plates")
			.badges.filter((b) => b.lift === "squat")
			.map((b) => b.id);
		expect(shown).toEqual(["squat-2", "squat-3"]);
	});
});

describe("computeAchievements — workouts and streaks", () => {
	it("counts workout days, not sessions", () => {
		const day = (d) => workout(d, [set("Squat", 100, 5)]);
		const workouts = [day("2026-11-01"), day("2026-11-01")];
		for (let i = 2; i <= 10; i++) {
			workouts.push(day(`2026-11-${String(i).padStart(2, "0")}`));
		}
		const result = compute({ workouts });
		expect(badge(result, "workouts-10")).toMatchObject({
			earnedOn: "2026-11-10",
		});
		expect(badge(result, "workouts-50")).toMatchObject({
			current: 10,
			target: 50,
		});
	});

	it("counts weeks in a row with at least one workout", () => {
		// Weeks start on Sunday: Oct 26, Nov 2, Nov 9, Nov 16.
		const result = compute({
			workouts: [
				workout("2026-10-27", [set("Squat", 100, 5)]),
				workout("2026-11-04", [set("Squat", 100, 5)]),
				workout("2026-11-12", [set("Squat", 100, 5)]),
				workout("2026-11-18", [set("Squat", 100, 5)]),
			],
		});
		expect(badge(result, "streak-2").earnedOn).toBe("2026-11-04");
		expect(badge(result, "streak-4").earnedOn).toBe("2026-11-18");
		expect(badge(result, "streak-8")).toMatchObject({ current: 4, target: 8 });
	});

	it("starts the count again after a week off", () => {
		const result = compute({
			workouts: [
				workout("2026-10-27", [set("Squat", 100, 5)]),
				workout("2026-11-12", [set("Squat", 100, 5)]),
			],
		});
		expect(badge(result, "streak-2").earnedOn).toBeNull();
	});
});

describe("computeAchievements — protein and steps", () => {
	it("counts days the protein goal was met", () => {
		const nutrition = [];
		for (let i = 1; i <= 7; i++) {
			nutrition.push({
				logDate: `2026-11-0${i}`,
				totalProtein: i === 3 ? 100 : 160,
				meals: [{}],
			});
		}
		nutrition.push({ logDate: "2026-11-08", totalProtein: 155, meals: [{}] });
		const result = compute({ nutrition });
		expect(badge(result, "protein-7").earnedOn).toBe("2026-11-08");
		expect(badge(result, "protein-30")).toMatchObject({
			current: 7,
			target: 30,
		});
	});

	it("counts 10,000-step days and lifetime steps", () => {
		const steps = [];
		for (let i = 1; i <= 7; i++) {
			steps.push({ logDate: `2026-11-0${i}`, steps: 12000 });
		}
		const result = compute({ steps });
		expect(badge(result, "steps-7").earnedOn).toBe("2026-11-07");
		expect(badge(result, "steps-1m")).toMatchObject({
			current: 84000,
			target: 1000000,
		});
	});
});

describe("computeAchievements — totals", () => {
	it("counts earned badges and milestones", () => {
		const result = compute({
			workouts: [workout("2026-11-18", [set("Bench Press", 135, 10)])],
		});
		// first workout, 1-plate bench, grand piano
		expect(result.earnedIds).toEqual(
			expect.arrayContaining(["workouts-1", "bench-1", "volume-piano"]),
		);
		expect(result.earnedCount).toBe(result.earnedIds.length);
		expect(result.totalCount).toBeGreaterThan(result.earnedCount);
	});
});

describe("newlyEarned", () => {
	it("lists ids earned since the last look, in order", () => {
		expect(newlyEarned(["a", "b"], ["a", "b", "c", "d"])).toEqual(["c", "d"]);
		expect(newlyEarned(["a"], ["a"])).toEqual([]);
	});
});
