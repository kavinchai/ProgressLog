import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planExerciseNames } from "./nameMatches.js";

const m = (name, yourSessions = 1, lifters = 1) => ({
	name,
	yourSessions,
	lifters,
});
const none = { exact: null, same: [], possible: [] };

describe("planExerciseNames", () => {
	it("uses the existing name for a clear spelling match", () => {
		const plan = planExerciseNames(["lat pull down"], {
			"lat pull down": { ...none, same: [m("Lat Pulldowns", 31)] },
		});
		assert.deepEqual(plan.names, { "lat pull down": "Lat Pulldowns" });
		assert.deepEqual(plan.renamed, [{ from: "lat pull down", to: "Lat Pulldowns" }]);
		assert.deepEqual(plan.ask, []);
	});

	it("keeps a name that already exists exactly", () => {
		const plan = planExerciseNames(["Lat Pulldowns"], {
			"Lat Pulldowns": { ...none, exact: m("Lat Pulldowns", 31) },
		});
		assert.deepEqual(plan.names, { "Lat Pulldowns": "Lat Pulldowns" });
		assert.deepEqual(plan.renamed, []);
	});

	it("asks when the name only loosely fits one or more lifts", () => {
		const plan = planExerciseNames(["incline press"], {
			"incline press": {
				...none,
				possible: [m("Incline Dumbbell Press", 13), m("Incline Bench Press", 11)],
			},
		});
		assert.deepEqual(plan.ask, [
			{
				name: "incline press",
				options: ["Incline Dumbbell Press", "Incline Bench Press"],
			},
		]);
	});

	it("asks when two existing lifts are both spelling matches", () => {
		const plan = planExerciseNames(["lat pulldown"], {
			"lat pulldown": {
				...none,
				same: [m("Lat Pulldowns", 31), m("Lat Pull-down", 0, 1)],
			},
		});
		assert.equal(plan.ask.length, 1);
		assert.deepEqual(plan.ask[0].options, ["Lat Pulldowns", "Lat Pull-down"]);
	});

	it("logs a brand-new lift as typed", () => {
		const plan = planExerciseNames(["Hip Thrust"], { "Hip Thrust": none });
		assert.deepEqual(plan.names, { "Hip Thrust": "Hip Thrust" });
		assert.deepEqual(plan.ask, []);
	});

	it("logs names the user confirmed as new exactly as given", () => {
		const plan = planExerciseNames(
			["incline press"],
			{ "incline press": { ...none, possible: [m("Incline Bench Press")] } },
			["Incline Press"],
		);
		assert.deepEqual(plan.names, { "incline press": "incline press" });
		assert.deepEqual(plan.ask, []);
	});

	it("doesn't ask when the loose matches are only other people's lifts", () => {
		const plan = planExerciseNames(["Bench Press"], {
			"Bench Press": { ...none, possible: [m("Incline Bench Press", 0, 2)] },
		});
		assert.deepEqual(plan.names, { "Bench Press": "Bench Press" });
		assert.deepEqual(plan.ask, []);
	});

	it("treats a failed lookup as no matches", () => {
		const plan = planExerciseNames(["Bench Press"], {});
		assert.deepEqual(plan.names, { "Bench Press": "Bench Press" });
	});
});
