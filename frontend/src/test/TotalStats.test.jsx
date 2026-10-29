/**
 * TotalStats page — month heatmap + selected-day panel + trend charts.
 *
 * Each calendar cell shows the day number and the selected metric (Calories by
 * default), with a dot on workout days. Clicking a past/today cell shows the
 * editable DayDetail in the side panel. Below: weight trend, avg calories per
 * week and workout consistency for the chosen range (default 3M).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TotalStats from "../pages/TotalStats";

// ── Static mocks ─────────────────────────────────────────────────────────────
vi.mock("../pages/TotalStats.css", () => ({}));
vi.mock("../pages/WeeklyStats.css", () => ({}));
vi.mock("../pages/History.css", () => ({}));

vi.mock("../components/HistoryCharts", () => ({
	WeightTrendChart: ({ title, data }) => (
		<div
			data-testid="trend-chart"
			data-title={title}
			data-points={data.length}
		/>
	),
	DailyBarChart: ({ title, data }) => (
		<div
			data-testid="trend-chart"
			data-title={title}
			data-points={data.length}
		/>
	),
	WorkoutGrid: ({ title, days }) => (
		<div
			data-testid="trend-chart"
			data-title={title}
			data-points={days.length}
			data-workout-days={days.filter((d) => d.count > 0).length}
		/>
	),
}));

// Stub DayDetail — has its own behavior; we only verify it renders with the right date
vi.mock("../components/DayDetail", () => ({
	default: ({ date }) => (
		<div data-testid="day-detail" data-date={date}>
			DayDetail for {date}
		</div>
	),
}));

vi.mock("../hooks/useWeightLog", () => ({ default: vi.fn() }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWorkouts", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWeightUnit", () => ({ default: vi.fn() }));
vi.mock("../hooks/useMediaQuery", () => ({
	default: vi.fn(() => false),
	MOBILE_QUERY: "(max-width: 640px)",
}));
vi.mock("../hooks/useUserProfile", () => ({
	default: () => ({
		goals: {
			calorieTargetTraining: 2600,
			calorieTargetRest: 2000,
			proteinTarget: 180,
		},
	}),
}));

import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useWeightUnit from "../hooks/useWeightUnit";
import useMediaQuery from "../hooks/useMediaQuery";

// Pin "today" so the calendar's active month is deterministic.
// 2026-04-15 12:00 local time → April 2026
beforeEach(() => {
	vi.useFakeTimers({
		toFake: ["Date"],
		now: new Date(2026, 3, 15, 12, 0, 0),
	});
});

beforeEach(() => {
	vi.clearAllMocks();
	useWeightUnit.mockReturnValue({
		unit: "lbs",
		toDisplay: (v) => v,
		toggleUnit: vi.fn(),
	});
	useWeightLog.mockReturnValue({
		data: [{ id: 1, logDate: "2026-04-10", weightLbs: 180 }],
		refetch: vi.fn(),
	});
	useNutrition.mockReturnValue({
		data: [
			{
				id: 11,
				logDate: "2026-04-10",
				dayType: "training",
				totalCalories: 2400,
				totalProtein: 180,
				meals: [
					{ id: 100, mealName: "eggs", calories: 2400, proteinGrams: 180 },
				],
			},
		],
		refetch: vi.fn(),
	});
	useWorkouts.mockReturnValue({
		data: [
			{
				id: 21,
				sessionDate: "2026-04-10",
				sessionName: "Push Day",
				exerciseSets: [],
			},
		],
		refetch: vi.fn(),
	});
	useSteps.mockReturnValue({
		data: [{ id: 31, logDate: "2026-04-10", steps: 8500 }],
		refetch: vi.fn(),
	});
});

// ── Tests ────────────────────────────────────────────────────────────────────

const cell = (date) => screen.getByTestId(`calendar-day-${date}`);

describe("TotalStats — heatmap calendar", () => {
	it("renders weekday headers (Sun–Sat)", () => {
		render(<TotalStats />);
		for (const d of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
			expect(screen.getByText(d)).toBeInTheDocument();
		}
	});

	it("renders a cell for each day in the active month", () => {
		render(<TotalStats />);
		expect(cell("2026-04-01")).toBeInTheDocument();
		expect(cell("2026-04-30")).toBeInTheDocument();
		expect(screen.queryByTestId("calendar-day-2026-05-01")).toBeNull();
	});

	it("shows the day number and calories by default, with a workout marker", () => {
		render(<TotalStats />);
		const c = cell("2026-04-10");
		expect(within(c).getByText("10")).toBeInTheDocument();
		expect(within(c).getByText("2,400")).toBeInTheDocument();
		expect(c).toHaveAccessibleName(/workout: push day/i);
	});

	it("switching the metric re-labels every cell", async () => {
		render(<TotalStats />);
		await userEvent.click(screen.getByRole("button", { name: "Steps" }));
		expect(within(cell("2026-04-10")).getByText("8,500")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Weight" }));
		expect(within(cell("2026-04-10")).getByText("180")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Protein" }));
		expect(within(cell("2026-04-10")).getByText("180g")).toBeInTheDocument();
	});

	it("future days are disabled", () => {
		render(<TotalStats />);
		expect(cell("2026-04-20")).toBeDisabled();
		expect(cell("2026-04-15")).toBeEnabled();
	});
});

describe("TotalStats — selected day panel", () => {
	it("starts with no day selected", () => {
		render(<TotalStats />);
		expect(screen.queryByTestId("day-detail")).not.toBeInTheDocument();
		expect(screen.getByText(/select a day/i)).toBeInTheDocument();
	});

	it("clicking a day shows its editable detail below the calendar", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-10"));
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-04-10");
		expect(cell("2026-04-10")).toHaveAttribute("aria-pressed", "true");
	});

	it("opens the day panel directly below the calendar card and scrolls to it", async () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		try {
			render(<TotalStats />);
			expect(
				screen.queryByRole("region", { name: /selected day/i }),
			).not.toBeInTheDocument();

			await userEvent.click(cell("2026-04-10"));
			const panel = screen.getByRole("region", { name: /selected day/i });
			// Next sibling of the calendar card (not a column beside it), so it
			// spans the page like Weekly's day panel.
			expect(panel.previousElementSibling).toContainElement(cell("2026-04-10"));
			expect(scrollIntoView).toHaveBeenCalled();
		} finally {
			delete Element.prototype.scrollIntoView;
		}
	});

	it("an empty past day can be selected so data can be added", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-05"));
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-04-05");
	});

	it("the close button clears the selection", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-10"));
		await userEvent.click(screen.getByRole("button", { name: /close day/i }));
		expect(screen.queryByTestId("day-detail")).not.toBeInTheDocument();
		expect(screen.getByText(/select a day/i)).toBeInTheDocument();
	});
});

describe("TotalStats — month summary", () => {
	it("summarises the active month", () => {
		render(<TotalStats />);
		expect(
			within(screen.getByRole("group", { name: /avg calories/i })).getByText(
				"2,400",
			),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("group", { name: /workouts/i })).getByText("1"),
		).toBeInTheDocument();
	});
});

describe("TotalStats — trends", () => {
	it("shows weight trend, avg calories per week and workout consistency, in that order", () => {
		render(<TotalStats />);
		expect(
			screen.getAllByTestId("trend-chart").map((c) => c.dataset.title),
		).toEqual(["Weight trend", "Avg calories per week", "Workout consistency"]);
	});

	it("defaults to the last 3 months and follows the range selector", async () => {
		render(<TotalStats />);
		expect(screen.getByRole("button", { name: "3M" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		const grid = () =>
			screen
				.getAllByTestId("trend-chart")
				.find((c) => c.dataset.title === "Workout consistency");
		expect(Number(grid().dataset.points)).toBeGreaterThanOrEqual(91);
		expect(grid().dataset.workoutDays).toBe("1");

		await userEvent.click(screen.getByRole("button", { name: "4W" }));
		expect(Number(grid().dataset.points)).toBeLessThan(40);
	});
});

describe("TotalStats — phones", () => {
	beforeEach(() => {
		useMediaQuery.mockReturnValue(true);
	});
	afterEach(() => {
		useMediaQuery.mockReturnValue(false);
	});

	it("uses a dropdown instead of buttons to pick the heatmap metric", async () => {
		render(<TotalStats />);
		expect(
			screen.queryByRole("group", { name: /color days by/i }),
		).not.toBeInTheDocument();
		await userEvent.selectOptions(
			screen.getByRole("combobox", { name: /color days by/i }),
			"steps",
		);
		expect(within(cell("2026-04-10")).getByText("8,500")).toBeInTheDocument();
	});

	it("opens the selected day in a bottom sheet instead of below the calendar", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-10"));
		const sheet = screen.getByRole("dialog", { name: "Fri 4/10" });
		expect(within(sheet).getByTestId("day-detail").dataset.date).toBe(
			"2026-04-10",
		);
		expect(
			screen.queryByRole("region", { name: /selected day/i }),
		).not.toBeInTheDocument();
	});

	it("previous / next day step through days inside the sheet, never past today", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-14"));
		await userEvent.click(screen.getByRole("button", { name: /next day/i }));
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-04-15");
		expect(screen.getByRole("button", { name: /next day/i })).toBeDisabled();
		await userEvent.click(
			screen.getByRole("button", { name: /previous day/i }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: /previous day/i }),
		);
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-04-13");
	});

	it("previous day from the 1st moves the calendar to the previous month", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-01"));
		await userEvent.click(
			screen.getByRole("button", { name: /previous day/i }),
		);
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-03-31");
		expect(cell("2026-03-31")).toBeInTheDocument();
	});

	it("closing the sheet clears the selection", async () => {
		render(<TotalStats />);
		await userEvent.click(cell("2026-04-10"));
		await userEvent.click(screen.getByRole("button", { name: /^close$/i }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("TotalStats — month navigation", () => {
	it("Prev / Next buttons are visible to navigate months", () => {
		render(<TotalStats />);
		expect(screen.getByRole("button", { name: /prev/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
	});

	it("enables Prev in the current month even when it has no data yet, and navigates to the previous month (regression)", async () => {
		// Today = June 2026, which has no logs. All data lives in May 2026.
		vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
		useWeightLog.mockReturnValue({
			data: [{ id: 1, logDate: "2026-05-10", weightLbs: 180 }],
			refetch: vi.fn(),
		});
		useNutrition.mockReturnValue({ data: [], refetch: vi.fn() });
		useWorkouts.mockReturnValue({ data: [], refetch: vi.fn() });
		useSteps.mockReturnValue({ data: [], refetch: vi.fn() });

		render(<TotalStats />);

		// Page opens on the current month (June) — Prev must be clickable so the
		// user can reach the months that actually have data.
		const prev = screen.getByRole("button", { name: /prev/i });
		expect(prev).toBeEnabled();
		expect(screen.queryByTestId("calendar-day-2026-05-10")).toBeNull();

		await userEvent.click(prev);

		// Now showing May 2026.
		expect(screen.getByTestId("calendar-day-2026-05-10")).toBeInTheDocument();
	});
});
