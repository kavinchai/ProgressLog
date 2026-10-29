/**
 * WeeklyStats page — week strip + selected day + daily charts.
 *
 * 2026-05-06 is a Wednesday → this week is 2026-05-03 (Sun) to 2026-05-09 (Sat).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeeklyStats from "../pages/WeeklyStats";

vi.mock("../pages/WeeklyStats.css", () => ({}));
vi.mock("../pages/History.css", () => ({}));

vi.mock("../components/DayDetail", () => ({
	default: ({ date }) => (
		<div data-testid="day-detail" data-date={date}>
			DayDetail for {date}
		</div>
	),
}));

vi.mock("../components/HistoryCharts", () => ({
	DailyBarChart: ({ title, data }) => (
		<div data-testid="daily-chart" data-title={title}>
			{data.map((d) => `${d.label}:${d.value ?? "-"}`).join(",")}
		</div>
	),
}));

vi.mock("../hooks/useWeightLog", () => ({ default: vi.fn() }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWorkouts", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWeightUnit", () => ({ default: vi.fn() }));
vi.mock("../hooks/useUserProfile", () => ({ default: vi.fn() }));

import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useWeightUnit from "../hooks/useWeightUnit";
import useUserProfile from "../hooks/useUserProfile";

function setup({
	weight = [],
	nutrition = [],
	workouts = [],
	steps = [],
} = {}) {
	useWeightLog.mockReturnValue({ data: weight, refetch: vi.fn() });
	useNutrition.mockReturnValue({ data: nutrition, refetch: vi.fn() });
	useWorkouts.mockReturnValue({ data: workouts, refetch: vi.fn() });
	useSteps.mockReturnValue({ data: steps, refetch: vi.fn() });
}

const dayCards = () =>
	within(screen.getByRole("list", { name: /days/i })).getAllByRole("button");

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 4, 6, 12, 0, 0) });
	vi.clearAllMocks();
	useWeightUnit.mockReturnValue({
		unit: "lbs",
		toDisplay: (v) => v,
		toggleUnit: vi.fn(),
	});
	useUserProfile.mockReturnValue({
		goals: {
			calorieTargetTraining: 2600,
			calorieTargetRest: 2000,
			proteinTarget: 180,
		},
	});
	setup();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("WeeklyStats — week strip", () => {
	it('labels the current week "This week" and disables Next', () => {
		render(<WeeklyStats />);
		expect(screen.getByText(/this week/i)).toBeInTheDocument();
		expect(screen.getByText("May 3 – 9")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /next week/i })).toBeDisabled();
	});

	it("shows the month only once unless the week crosses months", async () => {
		vi.useRealTimers();
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date(2026, 4, 6, 12, 0, 0),
			shouldAdvanceTime: true,
		});
		render(<WeeklyStats />);
		await userEvent.click(
			screen.getByRole("button", { name: /previous week/i }),
		);
		expect(screen.getByText("Apr 26 – May 2")).toBeInTheDocument();
	});

	it("renders one card per day, Sunday to Saturday", () => {
		render(<WeeklyStats />);
		const names = dayCards().map((b) => b.getAttribute("aria-label"));
		expect(names).toEqual([
			"Sun 5/3",
			"Mon 5/4",
			"Tue 5/5",
			"Wed 5/6",
			"Thu 5/7",
			"Fri 5/8",
			"Sat 5/9",
		]);
	});

	it("shows only this week's data on the cards", () => {
		setup({
			weight: [
				{ id: 1, logDate: "2026-05-05", weightLbs: 175 },
				{ id: 2, logDate: "2026-05-02", weightLbs: 999 },
			],
		});
		render(<WeeklyStats />);
		expect(
			within(screen.getByRole("button", { name: "Tue 5/5" })).getByText("175"),
		).toBeInTheDocument();
		expect(screen.queryByText("999")).not.toBeInTheDocument();
	});

	it("future days are disabled", () => {
		render(<WeeklyStats />);
		expect(screen.getByRole("button", { name: "Thu 5/7" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Wed 5/6" })).toBeEnabled();
	});
});

describe("WeeklyStats — selected day", () => {
	it("selects today by default and shows its editable day panel", () => {
		render(<WeeklyStats />);
		expect(screen.getByRole("button", { name: "Wed 5/6" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-05-06");
	});

	it("clicking another day switches the panel to that day", async () => {
		vi.useRealTimers();
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date(2026, 4, 6, 12, 0, 0),
			shouldAdvanceTime: true,
		});
		render(<WeeklyStats />);
		await userEvent.click(screen.getByRole("button", { name: "Mon 5/4" }));
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-05-04");
	});
});

describe("WeeklyStats — week navigation", () => {
	it("Prev shows last week, selects its last day and enables Next", async () => {
		vi.useRealTimers();
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date(2026, 4, 6, 12, 0, 0),
			shouldAdvanceTime: true,
		});
		render(<WeeklyStats />);
		await userEvent.click(
			screen.getByRole("button", { name: /previous week/i }),
		);
		expect(dayCards()[0]).toHaveAttribute("aria-label", "Sun 4/26");
		expect(screen.queryByText(/this week/i)).not.toBeInTheDocument();
		expect(screen.getByTestId("day-detail").dataset.date).toBe("2026-05-02");
		expect(screen.getByRole("button", { name: /next week/i })).toBeEnabled();
	});
});

describe("WeeklyStats — summary and charts", () => {
	it("the Workouts tile marks each day of the week (filled = workout)", () => {
		setup({
			workouts: [{ id: 7, sessionDate: "2026-05-04", sessionName: "Pull" }],
		});
		render(<WeeklyStats />);
		const marks = within(
			screen.getByRole("group", { name: /workouts/i }),
		).getAllByRole("listitem");
		expect(marks).toHaveLength(7);
		expect(marks[1]).toHaveAccessibleName("Mon: workout");
		expect(marks[0]).toHaveAccessibleName("Sun: no workout");
		expect(marks[6]).toHaveAccessibleName("Sat: upcoming");
	});

	it("a Calories / Steps switch picks which chart shows on phones", async () => {
		vi.useRealTimers();
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date(2026, 4, 6, 12, 0, 0),
			shouldAdvanceTime: true,
		});
		render(<WeeklyStats />);
		const charts = screen.getByTestId("weekly-charts");
		expect(charts.dataset.show).toBe("calories");
		expect(screen.getByRole("button", { name: "Calories" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await userEvent.click(screen.getByRole("button", { name: "Steps" }));
		expect(charts.dataset.show).toBe("steps");
		// Both charts stay rendered; CSS shows one at a time on phones only
		expect(screen.getAllByTestId("daily-chart")).toHaveLength(2);
	});

	it("shows averages and how weight compares to last week", () => {
		setup({
			weight: [
				{ id: 1, logDate: "2026-04-28", weightLbs: 181 },
				{ id: 2, logDate: "2026-05-04", weightLbs: 180 },
				{ id: 3, logDate: "2026-05-05", weightLbs: 179 },
			],
			workouts: [{ id: 7, sessionDate: "2026-05-04", sessionName: "Pull" }],
		});
		render(<WeeklyStats />);
		const avgWeight = screen.getByRole("group", { name: /avg weight/i });
		expect(within(avgWeight).getByText("179.5")).toBeInTheDocument();
		expect(
			within(avgWeight).getByText(/1\.5 vs last week/),
		).toBeInTheDocument();
		const workouts = screen.getByRole("group", { name: /workouts/i });
		expect(within(workouts).getByText("1 / 7")).toBeInTheDocument();
	});

	it("renders calories-per-day and steps-per-day charts under the day panel", () => {
		setup({
			steps: [{ id: 1, logDate: "2026-05-04", steps: 8000 }],
			nutrition: [
				{
					id: 3,
					logDate: "2026-05-04",
					dayType: "training",
					totalCalories: 2100,
					totalProtein: 150,
					meals: [{ id: 1, calories: 2100, proteinGrams: 150 }],
				},
			],
		});
		render(<WeeklyStats />);
		const charts = screen.getAllByTestId("daily-chart");
		expect(charts.map((c) => c.dataset.title)).toEqual([
			"Calories per day",
			"Steps per day",
		]);
		expect(charts[0]).toHaveTextContent("Mon:2100");
		expect(charts[1]).toHaveTextContent("Mon:8000");
		// Day panel comes before the charts
		const panel = screen.getByTestId("day-detail");
		expect(
			panel.compareDocumentPosition(charts[0]) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
