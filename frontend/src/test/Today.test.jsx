/**
 * Today page — visual and interaction tests.
 *
 * Each test answers one of three questions:
 *   DISPLAY  — is the data actually shown on the page?
 *   OPENS    — does clicking a button make the right modal appear?
 *   ACTION   — does clicking delete/rename call the API and trigger a refetch?
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Today from "../pages/Today";

// ── Static mocks ─────────────────────────────────────────────────────────────

vi.mock("../pages/Today.css", () => ({}));
vi.mock("../components/DailyProgressBar.css", () => ({}));

// Toast is exercised in Toast.test.jsx and useDayActions.test.js — stub here,
// keeping one shared stub so tests can check the Undo toast.
const toast = vi.hoisted(() => ({ error: null, show: null, dismiss: null }));
vi.mock("../components/Toast", () => ({
	useToast: () => toast,
	ToastProvider: ({ children }) => children,
}));

// Fix the date so TODAY constant in Today.jsx is predictable
vi.mock("../utils/date", () => ({
	localDateStr: () => "2026-04-10",
	formatDayLabel: () => "Fri, Apr 10",
}));

// Stub all modals — they have their own test files.
// Each stub records which props it received so tests can inspect them.
vi.mock("../components/WeightModal", () => ({
	default: ({ existing, onClose, onSaved }) => (
		<div data-testid="weight-modal" data-existing-id={existing?.id ?? ""}>
			<button onClick={onSaved}>modal-save</button>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/StepsModal", () => ({
	default: ({ prefillDate, existing, onClose, onSaved }) => (
		<div
			data-testid="steps-modal"
			data-existing-id={existing?.id ?? ""}
			data-date={prefillDate}
		>
			<button onClick={onSaved}>steps-save</button>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/WorkoutBuilderModal", () => ({
	default: ({
		prefillExercises,
		existingSession,
		appendBlankExercise,
		onClose,
	}) => (
		<div
			data-testid="workout-modal"
			data-prefill={prefillExercises ? JSON.stringify(prefillExercises) : ""}
			data-existing-session-id={existingSession?.id ?? ""}
			data-append-blank={appendBlankExercise ? "true" : "false"}
		>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/EditExerciseModal", () => ({
	default: ({ exerciseName, sessionId, onClose }) => (
		<div
			data-testid="edit-exercise-modal"
			data-name={exerciseName}
			data-session={sessionId}
		>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/DayInfoModal", () => ({
	default: ({ existing, onClose }) => (
		<div data-testid="dayinfo-modal" data-existing-id={existing?.id ?? ""}>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/MealCards", () => ({
	default: ({ nutritionEntry, getOrCreateNutritionLogId }) => (
		<div data-testid="meal-cards" data-log-id={nutritionEntry?.id ?? ""}>
			<button onClick={getOrCreateNutritionLogId}>stub-create-log</button>
		</div>
	),
}));
vi.mock("../components/DailyProgressBar", () => ({
	default: ({ caloriesGoal, stepsGoal }) => (
		<div
			data-testid="daily-progress-bar"
			data-calories-goal={caloriesGoal}
			data-steps-goal={stepsGoal}
		/>
	),
}));

vi.mock("../api", () => ({
	default: { delete: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("../hooks/useWeightLog", () => ({ default: vi.fn() }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWorkouts", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));
vi.mock("../hooks/useUserProfile", () => ({ default: vi.fn() }));
vi.mock("../hooks/usePRs", () => ({ default: vi.fn() }));

import api from "../api";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import usePRs from "../hooks/usePRs";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = "2026-04-10";

const WEIGHT_ENTRY = { id: 1, logDate: TODAY, weightLbs: 185 };
const WORKOUT_ENTRY = {
	id: 10,
	sessionDate: TODAY,
	sessionName: "Push",
	exerciseSets: [
		{
			id: 1,
			exerciseName: "Bench Press",
			setNumber: 1,
			reps: 8,
			weightLbs: 135,
		},
		{
			id: 2,
			exerciseName: "Bench Press",
			setNumber: 2,
			reps: 6,
			weightLbs: 135,
		},
		{ id: 3, exerciseName: "OHP", setNumber: 1, reps: 10, weightLbs: 95 },
	],
};
const NUTRITION_ENTRY = {
	id: 5,
	logDate: TODAY,
	dayType: "training",
	steps: 8000,
	totalCalories: 1800,
	totalProtein: 120,
	meals: [
		{ id: 11, mealName: "Breakfast", calories: 600, proteinGrams: 40 },
		{ id: 12, mealName: "Lunch", calories: 1200, proteinGrams: 80 },
	],
};
const DEFAULT_GOALS = {
	calorieTargetTraining: 2600,
	calorieTargetRest: 2000,
	proteinTarget: 180,
};

// ── Test helpers ──────────────────────────────────────────────────────────────

function setup({
	weight = [],
	nutrition = [],
	workouts = [],
	steps = [],
	prs = [],
	goals = DEFAULT_GOALS,
} = {}) {
	const refetchWeight = vi.fn();
	const refetchNutrition = vi.fn();
	const refetchWorkouts = vi.fn();
	const refetchSteps = vi.fn();
	const refetchPRs = vi.fn();

	useWeightLog.mockReturnValue({ data: weight, refetch: refetchWeight });
	useNutrition.mockReturnValue({ data: nutrition, refetch: refetchNutrition });
	useWorkouts.mockReturnValue({ data: workouts, refetch: refetchWorkouts });
	useSteps.mockReturnValue({ data: steps, refetch: refetchSteps });
	useUserProfile.mockReturnValue({ goals, loading: false });
	usePRs.mockReturnValue({ data: prs, refetch: refetchPRs });

	return {
		refetchWeight,
		refetchNutrition,
		refetchWorkouts,
		refetchSteps,
		refetchPRs,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	toast.error = vi.fn();
	toast.show = vi.fn(() => 1);
	toast.dismiss = vi.fn();
});

// Opens a card's ••• menu and picks an action.
async function chooseFromMenu(menuName, item) {
	await userEvent.click(screen.getByRole("button", { name: menuName }));
	await userEvent.click(screen.getByRole("menuitem", { name: item }));
}

// ── Progress bar goals ────────────────────────────────────────────────────────

describe("Today — progress bar goals", () => {
	it("uses the rest-day calorie goal for the progress bar", () => {
		setup({ nutrition: [{ ...NUTRITION_ENTRY, dayType: "rest" }] });
		render(<Today />);
		expect(screen.getByTestId("daily-progress-bar").dataset.caloriesGoal).toBe(
			"2000",
		);
	});
});

// ── Empty states ──────────────────────────────────────────────────────────────

describe("Today — empty states", () => {
	it("renders the daily progress bar at the top", () => {
		setup();
		render(<Today />);
		expect(screen.getByTestId("daily-progress-bar")).toBeInTheDocument();
	});

	it('shows "No entry for today" in the workout card and an add row for weight', () => {
		setup();
		render(<Today />);
		// Workout shows this span; weight is an add row; nutrition shows meal boxes
		expect(screen.getAllByText(/no entry for today/i)).toHaveLength(1);
		expect(
			screen.getByRole("button", { name: /\+ add weight/i }),
		).toBeInTheDocument();
	});

	it("shows + Add buttons for daily logs and Start Workout when nothing logged", () => {
		setup();
		render(<Today />);
		// Weight and steps each show a labelled add button in their section body
		expect(
			screen.getByRole("button", { name: /\+ add weight/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /\+ add steps/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /start workout/i }),
		).toBeInTheDocument();
	});

	it("does NOT offer to edit or delete weight when no weight entry", () => {
		setup();
		render(<Today />);
		expect(
			screen.queryByRole("button", { name: "Edit weight" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "More actions for Weight" }),
		).not.toBeInTheDocument();
	});

	it('shows "No entry for today" in workout section when no workout logged', () => {
		setup();
		render(<Today />);
		expect(screen.getByText(/no entry for today/i)).toBeInTheDocument();
	});

	it("shows the meal boxes in nutrition even when no nutrition logged", () => {
		setup();
		render(<Today />);
		expect(screen.getByTestId("meal-cards").dataset.logId).toBe("");
	});
});

// ── DISPLAY: weight section ───────────────────────────────────────────────────

describe("Today — weight display", () => {
	it("shows the logged weight value in lbs", () => {
		setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		expect(screen.getByText("185 lbs")).toBeInTheDocument();
	});

	it("lets you tap the weight to edit it, with a menu to delete it", () => {
		setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		expect(
			screen.getByRole("button", { name: "Edit weight" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "More actions for Weight" }),
		).toBeInTheDocument();
	});

	it("does NOT show + Add in weight section when weight already logged today", () => {
		setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		// Weight section's add button is gone; steps section still has one
		expect(
			screen.queryByRole("button", { name: /\+ add weight/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /\+ add steps/i }),
		).toBeInTheDocument();
	});

	it("ignores weight entries from other dates", () => {
		setup({ weight: [{ id: 99, logDate: "2025-01-01", weightLbs: 200 }] });
		render(<Today />);
		expect(screen.queryByText("200 lbs")).not.toBeInTheDocument();
		// The old entry is filtered out, so weight offers to add one
		expect(
			screen.getByRole("button", { name: /\+ add weight/i }),
		).toBeInTheDocument();
	});
});

// ── DISPLAY: workout / exercise section ───────────────────────────────────────

describe("Today — workout display", () => {
	it("shows exercise names when workout has exercises", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		expect(screen.getByText("Bench Press")).toBeInTheDocument();
		expect(screen.getByText("OHP")).toBeInTheDocument();
	});

	it("shows exercise weight in the exercise card", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		// 135 lbs should appear for Bench Press
		expect(screen.getAllByText(/135 lbs/i).length).toBeGreaterThan(0);
	});

	it("shows individual set reps in the exercise card", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		// Bench Press has reps 8 and 6
		expect(screen.getByText("8")).toBeInTheDocument();
		expect(screen.getByText("6")).toBeInTheDocument();
	});

	it("shows session name in the workout header", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		expect(screen.getByText("Push")).toBeInTheDocument();
	});

	it('shows "Session logged. No exercises yet." when session exists but has no sets', () => {
		const emptySession = {
			id: 20,
			sessionDate: TODAY,
			sessionName: null,
			exerciseSets: [],
		};
		setup({ workouts: [emptySession] });
		render(<Today />);
		expect(screen.getByText(/session logged/i)).toBeInTheDocument();
	});

	it("lets you tap each exercise to edit it", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		expect(
			screen.getByRole("button", { name: "Edit Bench Press" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Edit OHP" }),
		).toBeInTheDocument();
	});

	it("shows a PR badge when today ties the all-time PR tuple", () => {
		const singleExercise = {
			id: 10,
			sessionDate: TODAY,
			sessionName: "Push",
			exerciseSets: [
				{
					id: 1,
					exerciseName: "Bench Press",
					setNumber: 1,
					reps: 8,
					weightLbs: 135,
				},
			],
		};
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "135",
				setCount: 1,
				maxRepsInSet: 8,
				achievedDate: TODAY,
			},
		];
		setup({ workouts: [singleExercise], prs });
		render(<Today />);
		expect(screen.getByText("PR")).toBeInTheDocument();
	});

	it("does NOT show a PR badge when weight is below the all-time PR", () => {
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "200",
				setCount: 3,
				maxRepsInSet: 5,
				achievedDate: "2025-01-01",
			},
			{
				exerciseName: "OHP",
				maxWeightLbs: "150",
				setCount: 3,
				maxRepsInSet: 5,
				achievedDate: "2025-01-01",
			},
		];
		setup({ workouts: [WORKOUT_ENTRY], prs });
		render(<Today />);
		expect(screen.queryByText("PR")).not.toBeInTheDocument();
	});

	it("shows a PR badge when same weight but more sets than the all-time PR", () => {
		const singleExercise = {
			id: 10,
			sessionDate: TODAY,
			sessionName: "Push",
			exerciseSets: [
				{
					id: 1,
					exerciseName: "Bench Press",
					setNumber: 1,
					reps: 5,
					weightLbs: 135,
				},
				{
					id: 2,
					exerciseName: "Bench Press",
					setNumber: 2,
					reps: 5,
					weightLbs: 135,
				},
				{
					id: 3,
					exerciseName: "Bench Press",
					setNumber: 3,
					reps: 5,
					weightLbs: 135,
				},
			],
		};
		// Old PR: same weight, but only 2 sets
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "135",
				setCount: 2,
				maxRepsInSet: 5,
				achievedDate: "2025-01-01",
			},
		];
		setup({ workouts: [singleExercise], prs });
		render(<Today />);
		expect(screen.getByText("PR")).toBeInTheDocument();
	});

	it("shows a PR badge when same weight + sets but higher max reps in any set", () => {
		const singleExercise = {
			id: 10,
			sessionDate: TODAY,
			sessionName: "Push",
			exerciseSets: [
				{
					id: 1,
					exerciseName: "Bench Press",
					setNumber: 1,
					reps: 10,
					weightLbs: 135,
				}, // 10 max
				{
					id: 2,
					exerciseName: "Bench Press",
					setNumber: 2,
					reps: 3,
					weightLbs: 135,
				},
			],
		};
		// Old PR: same weight, same set count, but max reps in any single set was 5
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "135",
				setCount: 2,
				maxRepsInSet: 5,
				achievedDate: "2025-01-01",
			},
		];
		setup({ workouts: [singleExercise], prs });
		render(<Today />);
		expect(screen.getByText("PR")).toBeInTheDocument();
	});

	it("does NOT show a PR badge when same weight but fewer sets than the all-time PR", () => {
		const singleExercise = {
			id: 10,
			sessionDate: TODAY,
			sessionName: "Push",
			exerciseSets: [
				{
					id: 1,
					exerciseName: "Bench Press",
					setNumber: 1,
					reps: 8,
					weightLbs: 135,
				},
			],
		};
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "135",
				setCount: 3,
				maxRepsInSet: 5,
				achievedDate: "2025-01-01",
			},
		];
		setup({ workouts: [singleExercise], prs });
		render(<Today />);
		expect(screen.queryByText("PR")).not.toBeInTheDocument();
	});

	it("does NOT show a PR badge when same weight + sets but lower max reps in any set", () => {
		const singleExercise = {
			id: 10,
			sessionDate: TODAY,
			sessionName: "Push",
			exerciseSets: [
				{
					id: 1,
					exerciseName: "Bench Press",
					setNumber: 1,
					reps: 4,
					weightLbs: 135,
				},
				{
					id: 2,
					exerciseName: "Bench Press",
					setNumber: 2,
					reps: 4,
					weightLbs: 135,
				},
			],
		};
		const prs = [
			{
				exerciseName: "Bench Press",
				maxWeightLbs: "135",
				setCount: 2,
				maxRepsInSet: 6,
				achievedDate: "2025-01-01",
			},
		];
		setup({ workouts: [singleExercise], prs });
		render(<Today />);
		expect(screen.queryByText("PR")).not.toBeInTheDocument();
	});
});

// ── DISPLAY: nutrition section ────────────────────────────────────────────────

describe("Today — nutrition display", () => {
	it("passes today's nutrition log to the meal boxes", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		expect(screen.getByTestId("meal-cards").dataset.logId).toBe("5");
	});

	it("shows the day's calories and protein in the Nutrition header", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		const header = screen.getByText("Nutrition").closest(".section-header");
		expect(header).toHaveTextContent("1,800 kcal · 120 g");
	});

	it("leaves the Nutrition header totals off when nothing is logged", () => {
		setup();
		render(<Today />);
		const header = screen.getByText("Nutrition").closest(".section-header");
		expect(header).not.toHaveTextContent("kcal");
	});

	it("shows day type toggle button", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		expect(
			screen.getByRole("button", { name: /training/i }),
		).toBeInTheDocument();
	});

	it("does not repeat the day type as a row in the nutrition section", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		expect(screen.queryByText("Day Type")).not.toBeInTheDocument();
	});

	it("labels the day-type toggle so it reads as a switch", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		expect(
			screen.getByRole("button", { name: /training day.*switch to rest/i }),
		).toBeInTheDocument();
	});
});

// ── OPENS: clicking add/edit buttons opens the right modal ────────────────────

describe("Today — opening modals", () => {
	it("+ Add weight button opens WeightModal", async () => {
		setup();
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: /\+ add weight/i }),
		);
		expect(screen.getByTestId("weight-modal")).toBeInTheDocument();
	});

	it("tapping the weight opens WeightModal with the existing entry", async () => {
		setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		await userEvent.click(screen.getByRole("button", { name: "Edit weight" }));
		const modal = screen.getByTestId("weight-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.existingId).toBe("1");
	});

	it("Start Workout button opens WorkoutBuilderModal for a new session", async () => {
		setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: /start workout/i }),
		);
		const modal = screen.getByTestId("workout-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.existingSessionId).toBe("");
	});

	it("Edit workout (••• menu) opens WorkoutBuilderModal for the existing session", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for workout", "Edit workout");
		const modal = screen.getByTestId("workout-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.existingSessionId).toBe("10");
		expect(modal.dataset.appendBlank).toBe("false");
	});

	it("+ Add another exercise opens the existing workout with a blank exercise appended", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: /add another exercise/i }),
		);
		const modal = screen.getByTestId("workout-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.existingSessionId).toBe("10");
		expect(modal.dataset.appendBlank).toBe("true");
	});

	it("tapping an exercise opens EditExerciseModal with correct exercise name", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: "Edit Bench Press" }),
		);
		const modal = screen.getByTestId("edit-exercise-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.name).toBe("Bench Press");
		expect(modal.dataset.session).toBe("10");
	});

	it("Edit day (••• menu) opens DayInfoModal with the existing nutrition entry", async () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for nutrition", "Edit day");
		const modal = screen.getByTestId("dayinfo-modal");
		expect(modal).toBeInTheDocument();
		expect(modal.dataset.existingId).toBe("5");
	});

	it("meal boxes can create today's nutrition log when none exists", async () => {
		api.post.mockResolvedValue({ data: { id: 99 } });
		setup();
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: "stub-create-log" }),
		);
		await waitFor(() => {
			expect(api.post).toHaveBeenCalledWith(
				"/nutrition",
				expect.objectContaining({ logDate: TODAY }),
			);
		});
	});

	it("there is no meal modal or per-meal Edit button any more", () => {
		setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);
		expect(screen.queryByTestId("meal-modal")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /add another meal/i }),
		).not.toBeInTheDocument();
	});

	it("closing a modal removes it from the page", async () => {
		setup();
		render(<Today />);
		// Open the weight modal via its add button
		await userEvent.click(
			screen.getByRole("button", { name: /\+ add weight/i }),
		);
		expect(screen.getByTestId("weight-modal")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /modal-close/i }));
		expect(screen.queryByTestId("weight-modal")).not.toBeInTheDocument();
	});
});

// ── ACTION: delete and rename call the API and trigger refetch ────────────────

describe("Today — delete actions", () => {
	it("Delete weight calls DELETE /weight/{id}, refetches weight and offers Undo", async () => {
		api.delete.mockResolvedValue({});
		const { refetchWeight } = setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);

		await chooseFromMenu("More actions for Weight", "Delete");

		await waitFor(() => {
			expect(api.delete).toHaveBeenCalledWith("/weight/1");
			expect(refetchWeight).toHaveBeenCalledTimes(1);
		});
		expect(toast.show).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Weight deleted",
				action: expect.objectContaining({ label: "Undo" }),
			}),
		);
	});

	it("Delete session calls DELETE /workouts/{id} and refetches workouts", async () => {
		api.delete.mockResolvedValue({});
		const { refetchWorkouts } = setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);

		await chooseFromMenu("More actions for workout", "Delete workout");

		await waitFor(() => {
			expect(api.delete).toHaveBeenCalledWith("/workouts/10");
			expect(refetchWorkouts).toHaveBeenCalledTimes(1);
		});
	});

	it("Delete day calls DELETE /nutrition/{id} and refetches nutrition", async () => {
		api.delete.mockResolvedValue({});
		const STEP_ENTRY = { id: 20, logDate: TODAY, steps: 8000 };
		const { refetchNutrition } = setup({
			nutrition: [NUTRITION_ENTRY],
			steps: [STEP_ENTRY],
		});
		render(<Today />);

		await chooseFromMenu("More actions for nutrition", "Delete nutrition log");

		await waitFor(() => {
			expect(api.delete).toHaveBeenCalledWith("/nutrition/5");
			expect(refetchNutrition).toHaveBeenCalledTimes(1);
		});
	});

	it("day-type toggle switches from training to rest and refetches", async () => {
		api.post.mockResolvedValue({});
		const { refetchNutrition } = setup({ nutrition: [NUTRITION_ENTRY] });
		render(<Today />);

		await userEvent.click(screen.getByRole("button", { name: /training/i }));

		await waitFor(() => {
			expect(api.post).toHaveBeenCalledWith(
				"/nutrition",
				expect.objectContaining({
					logDate: TODAY,
					dayType: "rest",
				}),
			);
			expect(refetchNutrition).toHaveBeenCalledTimes(1);
		});
	});
});

// ── ACTION: rename session ────────────────────────────────────────────────────

describe("Today — rename workout session", () => {
	it("Rename (••• menu) shows a text input and save/cancel", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for workout", "Rename");
		expect(screen.getByPlaceholderText(/session name/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^Save$/i })).toBeInTheDocument();
	});

	it("× cancel button hides the rename input", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for workout", "Rename");
		await userEvent.click(screen.getByRole("button", { name: /×/ }));
		expect(
			screen.queryByPlaceholderText(/session name/i),
		).not.toBeInTheDocument();
	});

	it("Save calls PATCH /workouts/{id}/name with the new name", async () => {
		api.patch.mockResolvedValue({});
		const { refetchWorkouts } = setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);

		await chooseFromMenu("More actions for workout", "Rename");
		const input = screen.getByPlaceholderText(/session name/i);
		await userEvent.clear(input);
		await userEvent.type(input, "Chest Day");
		await userEvent.click(screen.getByRole("button", { name: /^Save$/i }));

		await waitFor(() => {
			expect(api.patch).toHaveBeenCalledWith("/workouts/10/name", {
				sessionName: "Chest Day",
			});
			expect(refetchWorkouts).toHaveBeenCalledTimes(1);
		});
		expect(
			screen.queryByPlaceholderText(/session name/i),
		).not.toBeInTheDocument();
	});
});

// ── DISPLAY: header and progress goals ───────────────────────────────────────

describe("Today — header and goals", () => {
	it("shows the date as a readable day label", () => {
		setup();
		render(<Today />);
		expect(screen.getByText("Fri, Apr 10")).toBeInTheDocument();
	});

	it("passes the user's steps goal to the progress bar", () => {
		setup({ goals: { ...DEFAULT_GOALS, stepsTarget: 7500 } });
		render(<Today />);
		expect(screen.getByTestId("daily-progress-bar").dataset.stepsGoal).toBe(
			"7500",
		);
	});

	it("falls back to a 10,000 steps goal when none is set", () => {
		setup();
		render(<Today />);
		expect(screen.getByTestId("daily-progress-bar").dataset.stepsGoal).toBe(
			"10000",
		);
	});
});

// ── STATES: a section that failed to load ────────────────────────────────────

describe("Today — load errors", () => {
	it("shows a friendly banner with Retry that refetches what failed", async () => {
		const { refetchWeight, refetchSteps } = setup();
		useWeightLog.mockReturnValue({
			data: [],
			refetch: refetchWeight,
			error: "Request failed with status code 500",
		});
		render(<Today />);

		expect(
			screen.getByText(/couldn't load some of today's data/i),
		).toBeInTheDocument();
		expect(screen.queryByText(/status code 500/i)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(refetchWeight).toHaveBeenCalledTimes(1);
		expect(refetchSteps).not.toHaveBeenCalled();
	});

	it("does not offer to add weight when weight failed to load", () => {
		const { refetchWeight } = setup();
		useWeightLog.mockReturnValue({
			data: [],
			refetch: refetchWeight,
			error: "boom",
		});
		render(<Today />);
		expect(
			screen.queryByRole("button", { name: /\+ add weight/i }),
		).not.toBeInTheDocument();
		expect(screen.getAllByText(/not loaded/i).length).toBeGreaterThan(0);
	});

	it("does not offer to add steps when steps failed to load", () => {
		const { refetchSteps } = setup();
		useSteps.mockReturnValue({
			data: [],
			refetch: refetchSteps,
			error: "boom",
		});
		render(<Today />);
		expect(
			screen.queryByRole("button", { name: /\+ add steps/i }),
		).not.toBeInTheDocument();
	});

	it("does not offer to start a workout when workouts failed to load", () => {
		const { refetchWorkouts } = setup();
		useWorkouts.mockReturnValue({
			data: [],
			refetch: refetchWorkouts,
			error: "boom",
		});
		render(<Today />);
		expect(
			screen.queryByRole("button", { name: /start workout/i }),
		).not.toBeInTheDocument();
	});

	it("hides the meal boxes when nutrition failed to load", () => {
		const { refetchNutrition } = setup();
		useNutrition.mockReturnValue({
			data: [],
			refetch: refetchNutrition,
			error: "boom",
		});
		render(<Today />);
		expect(screen.queryByTestId("meal-cards")).not.toBeInTheDocument();
	});
});

// ── A11y: inline inputs have labels ──────────────────────────────────────────

describe("Today — inline input labels", () => {
	it("labels the inline session name input", async () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for workout", "Rename");
		expect(screen.getByLabelText("Session name")).toHaveAttribute(
			"type",
			"text",
		);
	});
});

// ── DISPLAY: loading ──────────────────────────────────────────────────────────

describe("Today — loading", () => {
	it("shows the day while PRs are still loading, without PR badges", () => {
		setup({ workouts: [WORKOUT_ENTRY] });
		usePRs.mockReturnValue({ data: [], loading: true, refetch: vi.fn() });
		render(<Today />);
		expect(
			screen.queryByText(/loading your daily stats/i),
		).not.toBeInTheDocument();
		expect(screen.getByText("Bench Press")).toBeInTheDocument();
		expect(screen.queryByText("PR")).not.toBeInTheDocument();
	});

	it("still waits for the day's own data before showing the page", () => {
		setup();
		useWorkouts.mockReturnValue({ data: [], loading: true, refetch: vi.fn() });
		render(<Today />);
		expect(screen.getByText(/loading your daily stats/i)).toBeInTheDocument();
	});
});

// ── ACTION: swipe, exercise delete and Undo ───────────────────────────────────

describe("Today — swipe, exercise delete and Undo", () => {
	const STEP_ENTRY = { id: 20, logDate: TODAY, steps: 8000 };

	it("shows weight and steps as two rows in one card", () => {
		setup({ weight: [WEIGHT_ENTRY], steps: [STEP_ENTRY] });
		render(<Today />);
		const weightRow = screen.getByRole("button", { name: "Edit weight" });
		const stepsRow = screen.getByRole("button", { name: "Edit steps" });
		expect(weightRow.closest(".section-box")).toBe(
			stepsRow.closest(".section-box"),
		);
		expect(stepsRow).toHaveTextContent("8,000");
	});

	it("swiping the weight row left reveals Delete, which deletes it", async () => {
		api.delete.mockResolvedValue({});
		const { refetchWeight } = setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		const row = screen.getByRole("button", { name: "Edit weight" });

		fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
		fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 101 }] });
		fireEvent.touchEnd(row, { touches: [] });
		await userEvent.click(
			screen.getByRole("button", { name: "Delete Weight" }),
		);

		await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/weight/1"));
		expect(refetchWeight).toHaveBeenCalledTimes(1);
	});

	it("+ Add steps opens today's steps sheet, which refreshes steps on save", async () => {
		const { refetchSteps } = setup();
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: /\+ add steps/i }),
		);
		const sheet = screen.getByTestId("steps-modal");
		expect(sheet.dataset.existingId).toBe("");
		expect(sheet.dataset.date).toBe(TODAY);
		await userEvent.click(screen.getByRole("button", { name: "steps-save" }));
		expect(refetchSteps).toHaveBeenCalledTimes(1);
	});

	it("tapping the steps row opens the steps sheet for that entry", async () => {
		setup({ steps: [STEP_ENTRY] });
		render(<Today />);
		await userEvent.click(screen.getByRole("button", { name: "Edit steps" }));
		expect(screen.getByTestId("steps-modal").dataset.existingId).toBe("20");
	});

	it("shows a check on logged rows and the value underneath", () => {
		setup({ weight: [WEIGHT_ENTRY], steps: [STEP_ENTRY] });
		render(<Today />);
		const stepsRow = screen.getByRole("button", { name: "Edit steps" });
		expect(stepsRow.querySelector(".status-row-icon--done")).not.toBeNull();
		expect(stepsRow.querySelector(".status-row-detail")).toHaveTextContent(
			"8,000 steps",
		);
	});

	it("shows an empty row with a dashed circle and + Add", () => {
		setup();
		render(<Today />);
		const addSteps = screen.getByRole("button", { name: "+ Add steps" });
		expect(addSteps.querySelector(".status-row-icon--empty")).not.toBeNull();
		expect(addSteps).toHaveTextContent("Steps+ Add");
	});

	it("Delete steps calls DELETE /steps/{id} without a confirmation", async () => {
		api.delete.mockResolvedValue({});
		const { refetchSteps } = setup({ steps: [STEP_ENTRY] });
		render(<Today />);

		await chooseFromMenu("More actions for Steps", "Delete");

		await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/steps/20"));
		expect(refetchSteps).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByRole("button", { name: /confirm delete/i }),
		).not.toBeInTheDocument();
	});

	it("deletes one exercise from the session", async () => {
		api.delete.mockResolvedValue({});
		const { refetchWorkouts } = setup({ workouts: [WORKOUT_ENTRY] });
		render(<Today />);

		await chooseFromMenu("More actions for Bench Press", "Delete");

		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith("/workouts/10/exercises", {
				params: { name: "Bench Press" },
			}),
		);
		expect(refetchWorkouts).toHaveBeenCalledTimes(1);
		expect(toast.show).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Bench Press deleted" }),
		);
	});

	it("Undo restores the deleted entry", async () => {
		api.delete.mockResolvedValue({});
		api.post.mockResolvedValue({});
		const { refetchWeight } = setup({ weight: [WEIGHT_ENTRY] });
		render(<Today />);
		await chooseFromMenu("More actions for Weight", "Delete");
		await waitFor(() => expect(toast.show).toHaveBeenCalled());

		await toast.show.mock.calls[0][0].action.onClick();

		expect(api.post).toHaveBeenCalledWith("/undo");
		expect(refetchWeight).toHaveBeenCalledTimes(2);
	});

	it("the workout menu has no Edit workout when the day has two sessions", async () => {
		setup({
			workouts: [
				WORKOUT_ENTRY,
				{ ...WORKOUT_ENTRY, id: 11, sessionName: null },
			],
		});
		render(<Today />);
		await userEvent.click(
			screen.getByRole("button", { name: "More actions for workout" }),
		);
		expect(
			screen.queryByRole("menuitem", { name: "Edit workout" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Delete workout" }),
		).toBeInTheDocument();
	});
});
