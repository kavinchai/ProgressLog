// The iOS widget is fed from the app layout, so it stays current whichever
// page is open. Moved here from Today.test.jsx when the widget code left Today.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useWidgetSync from "../hooks/useWidgetSync";

vi.mock("../utils/date", () => ({ localDateStr: () => "2026-04-10" }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));
vi.mock("../hooks/useUserProfile", () => ({ default: vi.fn() }));
vi.mock("../native/widget", () => ({ updateWidget: vi.fn() }));

import useNutrition from "../hooks/useNutrition";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import { updateWidget } from "../native/widget";

const TODAY = "2026-04-10";
const NUTRITION_ENTRY = {
	id: 5,
	logDate: TODAY,
	dayType: "training",
	totalCalories: 1800,
	totalProtein: 120,
};
const DEFAULT_GOALS = {
	calorieTargetTraining: 2600,
	calorieTargetRest: 2000,
	proteinTarget: 180,
};

function setup({ nutrition = [], steps = [], goals = DEFAULT_GOALS } = {}) {
	useNutrition.mockReturnValue({ data: nutrition, refetch: vi.fn() });
	useSteps.mockReturnValue({ data: steps, refetch: vi.fn() });
	useUserProfile.mockReturnValue({ goals, loading: false });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useWidgetSync", () => {
	it("sends today's calories, protein and steps to the widget", () => {
		setup({
			nutrition: [NUTRITION_ENTRY],
			steps: [{ id: 3, logDate: TODAY, steps: 6500 }],
		});
		renderHook(() => useWidgetSync());
		expect(updateWidget).toHaveBeenCalledWith({
			date: TODAY,
			calories: 1800,
			calorieGoal: 2600,
			protein: 120,
			proteinGoal: 180,
			steps: 6500,
			stepsGoal: 10000,
		});
	});

	it("uses the rest-day calorie goal", () => {
		setup({ nutrition: [{ ...NUTRITION_ENTRY, dayType: "rest" }] });
		renderHook(() => useWidgetSync());
		expect(updateWidget).toHaveBeenCalledWith(
			expect.objectContaining({ calorieGoal: 2000 }),
		);
	});

	it("does not update the widget while today's data is still loading", () => {
		setup();
		useNutrition.mockReturnValue({ data: [], loading: true, refetch: vi.fn() });
		renderHook(() => useWidgetSync());
		expect(updateWidget).not.toHaveBeenCalled();
	});

	it("does not update the widget while goals are still loading", () => {
		setup();
		useUserProfile.mockReturnValue({ goals: DEFAULT_GOALS, loading: true });
		renderHook(() => useWidgetSync());
		expect(updateWidget).not.toHaveBeenCalled();
	});

	it("does not overwrite the widget with zeros when nutrition failed to load", () => {
		setup();
		useNutrition.mockReturnValue({ data: [], refetch: vi.fn(), error: "boom" });
		renderHook(() => useWidgetSync());
		expect(updateWidget).not.toHaveBeenCalled();
	});

	it("does not overwrite the widget with zeros when steps failed to load", () => {
		setup();
		useSteps.mockReturnValue({ data: [], refetch: vi.fn(), error: "boom" });
		renderHook(() => useWidgetSync());
		expect(updateWidget).not.toHaveBeenCalled();
	});

	it("sends the widget once loading finishes", () => {
		setup();
		useSteps.mockReturnValue({ data: [], loading: true, refetch: vi.fn() });
		const { rerender } = renderHook(() => useWidgetSync());
		expect(updateWidget).not.toHaveBeenCalled();
		useSteps.mockReturnValue({
			data: [{ id: 3, logDate: TODAY, steps: 4200 }],
			refetch: vi.fn(),
		});
		rerender();
		expect(updateWidget).toHaveBeenCalledTimes(1);
		expect(updateWidget).toHaveBeenLastCalledWith(
			expect.objectContaining({ steps: 4200 }),
		);
	});

	it("sends new totals after a meal changes today's calories", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		const { rerender } = renderHook(() => useWidgetSync());
		useNutrition.mockReturnValue({
			data: [{ ...NUTRITION_ENTRY, totalCalories: 2300, totalProtein: 150 }],
			refetch: vi.fn(),
		});
		rerender();
		expect(updateWidget).toHaveBeenCalledTimes(2);
		expect(updateWidget).toHaveBeenLastCalledWith(
			expect.objectContaining({ calories: 2300, protein: 150 }),
		);
	});

	it("sends new steps after an Apple Health sync updates them", () => {
		setup({ steps: [{ id: 3, logDate: TODAY, steps: 4200 }] });
		const { rerender } = renderHook(() => useWidgetSync());
		useSteps.mockReturnValue({
			data: [{ id: 3, logDate: TODAY, steps: 9100 }],
			refetch: vi.fn(),
		});
		rerender();
		expect(updateWidget).toHaveBeenLastCalledWith(
			expect.objectContaining({ steps: 9100 }),
		);
	});

	it("does not resend on a re-render with the same numbers", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		const { rerender } = renderHook(() => useWidgetSync());
		useNutrition.mockReturnValue({
			data: [{ ...NUTRITION_ENTRY }],
			refetch: vi.fn(),
		});
		rerender();
		expect(updateWidget).toHaveBeenCalledTimes(1);
	});
});
