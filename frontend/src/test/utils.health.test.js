import { describe, expect, it } from "vitest";
import { planHealthWrites } from "../utils/health";

describe("planHealthWrites", () => {
	it("writes Health steps for days that are missing or different", () => {
		const plan = planHealthWrites({
			healthSteps: [
				{ date: "2026-11-10", steps: 8000 },
				{ date: "2026-11-11", steps: 9500 },
				{ date: "2026-11-12", steps: 7000 },
			],
			healthWeights: [],
			existingSteps: [
				{ logDate: "2026-11-10", steps: 8000 },
				{ logDate: "2026-11-11", steps: 4000 },
			],
			existingWeights: [],
		});
		expect(plan.steps).toEqual([
			{ logDate: "2026-11-11", steps: 9500 },
			{ logDate: "2026-11-12", steps: 7000 },
		]);
	});

	it("never replaces a day with zero Health steps", () => {
		const plan = planHealthWrites({
			healthSteps: [{ date: "2026-11-10", steps: 0 }],
			healthWeights: [],
			existingSteps: [{ logDate: "2026-11-10", steps: 6000 }],
			existingWeights: [],
		});
		expect(plan.steps).toEqual([]);
	});

	it("writes Health weights rounded to 0.1 lb when they differ", () => {
		const plan = planHealthWrites({
			healthSteps: [],
			healthWeights: [
				{ date: "2026-11-10", pounds: 180.04 },
				{ date: "2026-11-11", pounds: 179.46 },
			],
			existingSteps: [],
			existingWeights: [{ logDate: "2026-11-10", weightLbs: 180.0 }],
		});
		expect(plan.weights).toEqual([{ logDate: "2026-11-11", weightLbs: 179.5 }]);
	});
});
