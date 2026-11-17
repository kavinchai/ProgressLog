/**
 * DayDetail (History day expansion).
 *
 * Mirrors Today: rows tap to edit and swipe (or ••• on the website) to delete,
 * with an Undo bar. When a single workout session already exists for the day,
 * "+ Add exercise" appends to that session (existingSession +
 * appendBlankExercise) rather than creating a brand-new workout.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DayDetail from "../components/DayDetail";
import api from "../api";

// ── Modal stubs — each records the props it received ──────────────────────────
vi.mock("../components/WorkoutBuilderModal", () => ({
	default: ({ existingSession, appendBlankExercise, onClose }) => (
		<div
			data-testid="workout-modal"
			data-existing-session-id={existingSession?.id ?? ""}
			data-append-blank={appendBlankExercise ? "true" : "false"}
		>
			<button onClick={onClose}>modal-close</button>
		</div>
	),
}));
vi.mock("../components/WeightModal", () => ({
	default: () => <div data-testid="weight-modal" />,
}));
vi.mock("../components/StepsModal", () => ({
	default: ({ prefillDate, existing, onSaved }) => (
		<div
			data-testid="steps-modal"
			data-existing-id={existing?.id ?? ""}
			data-date={prefillDate}
		>
			<button onClick={onSaved}>steps-save</button>
		</div>
	),
}));
vi.mock("../components/DayInfoModal", () => ({
	default: () => <div data-testid="dayinfo-modal" />,
}));
vi.mock("../components/MealCards", () => ({
	default: ({ nutritionEntry, getOrCreateNutritionLogId }) => (
		<div
			data-testid="meal-cards"
			data-log-id={nutritionEntry?.id ?? ""}
			data-can-create={String(typeof getOrCreateNutritionLogId === "function")}
		/>
	),
}));
vi.mock("../components/EditExerciseModal", () => ({
	default: () => <div data-testid="edit-exercise-modal" />,
}));

vi.mock("../api", () => ({
	default: { delete: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

// One shared toast stub so tests can check the Undo toast.
const toast = vi.hoisted(() => ({
	error: () => {},
	show: () => 1,
	dismiss: () => {},
}));
vi.mock("../components/Toast", () => ({ useToast: () => toast }));

vi.mock("../hooks/useWeightUnit", () => ({
	default: () => ({ unit: "lbs", toDisplay: (x) => x }),
}));
const { setRenamingSession, setRenameValue } = vi.hoisted(() => ({
	setRenamingSession: vi.fn(),
	setRenameValue: vi.fn(),
}));
vi.mock("../hooks/useDayActions", () => ({
	useDayActions: () => ({
		renamingSession: false,
		setRenamingSession,
		renameValue: "",
		setRenameValue,
		submitRename: vi.fn(),
		getOrCreateNutritionLogId: vi.fn(),
	}),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const DATE = "2026-05-01";

const SINGLE_SESSION = {
	id: 10,
	sessionDate: DATE,
	sessionName: "Push",
	_sessionCount: 1,
	exerciseSets: [
		{
			id: 1,
			exerciseName: "Bench Press",
			setNumber: 1,
			reps: 8,
			weightLbs: 135,
			_sessionId: 10,
		},
	],
};
const MULTI_SESSION = {
	id: 10,
	sessionDate: DATE,
	sessionName: "Push",
	_sessionCount: 2,
	exerciseSets: [
		{
			id: 1,
			exerciseName: "Bench Press",
			setNumber: 1,
			reps: 8,
			weightLbs: 135,
			_sessionId: 10,
		},
		{
			id: 2,
			exerciseName: "Squat",
			setNumber: 1,
			reps: 5,
			weightLbs: 225,
			_sessionId: 11,
		},
	],
};

// Give weight + steps real entries so they render as "Edit weight" / "Edit steps"
// rows, so the only add buttons left are the workout's.
function renderDetail(workoutEntry) {
	return render(
		<DayDetail
			date={DATE}
			weightEntry={{ id: 99, logDate: DATE, weightLbs: 185 }}
			nutritionEntry={null}
			workoutEntry={workoutEntry}
			stepEntry={{ id: 98, logDate: DATE, steps: 8000 }}
			onRefetchW={vi.fn()}
			onRefetchN={vi.fn()}
			onRefetchWo={vi.fn()}
			onRefetchS={vi.fn()}
		/>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("DayDetail — meals", () => {
	it("shows the meal boxes even when the day has no nutrition log", () => {
		renderDetail(null);
		const cards = screen.getByTestId("meal-cards");
		expect(cards.dataset.logId).toBe("");
		expect(cards.dataset.canCreate).toBe("true");
		expect(
			screen.queryByRole("button", { name: /\+ meal/i }),
		).not.toBeInTheDocument();
	});

	it("passes the day's nutrition log to the meal rows and shows the totals in the header", () => {
		render(
			<DayDetail
				date={DATE}
				weightEntry={null}
				nutritionEntry={{
					id: 5,
					logDate: DATE,
					dayType: "rest",
					totalCalories: 1390,
					totalProtein: 101,
					meals: [
						{
							id: 1,
							mealLabel: "Breakfast",
							mealName: "Yogurt",
							calories: 450,
							proteinGrams: 38,
						},
					],
				}}
				workoutEntry={null}
				stepEntry={null}
				onRefetchW={vi.fn()}
				onRefetchN={vi.fn()}
				onRefetchWo={vi.fn()}
				onRefetchS={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("meal-cards").dataset.logId).toBe("5");
		expect(
			screen.getByText("Nutrition").closest(".day-detail-section-head"),
		).toHaveTextContent("1,390 kcal · 101 g");
	});
});

describe("DayDetail — nutrition header", () => {
	it("leaves the totals off when the day has no meals", () => {
		renderDetail(null);
		expect(
			screen.getByText("Nutrition").closest(".day-detail-section-head"),
		).not.toHaveTextContent("kcal");
	});
});

describe("DayDetail — workout add", () => {
	it("creates a new workout when no session exists for the day", async () => {
		renderDetail(null);
		const add = screen.getByRole("button", { name: "+ Add workout" });
		expect(add).toHaveTextContent("No workout");
		await userEvent.click(add);
		const modal = screen.getByTestId("workout-modal");
		expect(modal.dataset.existingSessionId).toBe("");
		expect(modal.dataset.appendBlank).toBe("false");
	});

	it("appends an exercise to the existing single session", async () => {
		renderDetail(SINGLE_SESSION);
		await userEvent.click(
			screen.getByRole("button", { name: /\+ Add exercise/i }),
		);
		const modal = screen.getByTestId("workout-modal");
		expect(modal.dataset.existingSessionId).toBe("10");
		expect(modal.dataset.appendBlank).toBe("true");
	});

	it("falls back to creating a new workout when the day has multiple sessions", async () => {
		renderDetail(MULTI_SESSION);
		const add = screen.getByRole("button", { name: "+ Add workout" });
		expect(add).toHaveClass("status-add-chip");
		await userEvent.click(add);
		const modal = screen.getByTestId("workout-modal");
		expect(modal.dataset.existingSessionId).toBe("");
		expect(modal.dataset.appendBlank).toBe("false");
	});
});

describe("DayDetail — exercise rows", () => {
	it("shows each exercise with its weight and a pill per set", () => {
		renderDetail(MULTI_SESSION);
		const squat = screen.getByRole("button", { name: "Edit Squat" });
		expect(squat.querySelector(".status-row-title")).toHaveTextContent("Squat");
		expect(squat.querySelector(".exercise-row-weight")).toHaveTextContent(
			"225 lbs",
		);
		expect(
			[...squat.querySelectorAll(".set-pill")].map((p) => p.textContent),
		).toEqual(["5"]);
	});

	it("shows No exercises yet for a session with no sets, with + Add exercise", () => {
		renderDetail({ ...SINGLE_SESSION, exerciseSets: [] });
		expect(screen.getByText("No exercises yet")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "+ Add exercise" }),
		).toBeInTheDocument();
	});

	it("sums up the workout in the header", () => {
		renderDetail(MULTI_SESSION);
		expect(
			screen.getByText("Workout").closest(".day-detail-section-head"),
		).toHaveTextContent("2 exercises · 2 sets");
	});
});

describe("DayDetail — workout only", () => {
	function renderWorkoutOnly(workoutEntry) {
		return render(
			<DayDetail
				date={DATE}
				weightEntry={{ id: 99, logDate: DATE, weightLbs: 185 }}
				nutritionEntry={null}
				workoutEntry={workoutEntry}
				stepEntry={{ id: 98, logDate: DATE, steps: 8000 }}
				onRefetchW={vi.fn()}
				onRefetchN={vi.fn()}
				onRefetchWo={vi.fn()}
				onRefetchS={vi.fn()}
				workoutOnly
			/>,
		);
	}

	it("shows only the workout, not weight, nutrition or steps", () => {
		renderWorkoutOnly(MULTI_SESSION);
		expect(screen.getByText("Workout")).toBeInTheDocument();
		expect(screen.queryByText("Weight")).not.toBeInTheDocument();
		expect(screen.queryByText("Nutrition")).not.toBeInTheDocument();
		expect(screen.queryByText("Steps")).not.toBeInTheDocument();
		expect(screen.queryByTestId("meal-cards")).not.toBeInTheDocument();
	});

	it("summarises the session: exercises, sets and volume", () => {
		renderWorkoutOnly(MULTI_SESSION);
		// 135×8 + 225×5 = 2,205
		expect(
			screen.getByText("2 exercises · 2 sets · 2,205 lbs volume"),
		).toBeInTheDocument();
	});

	it("doesn't repeat the summary in the header in the workout-only view", () => {
		const { container } = renderWorkoutOnly(MULTI_SESSION);
		expect(container.querySelector(".day-detail-meta")).toBeNull();
	});

	it("only shows the summary in the workout-only view", () => {
		renderDetail(MULTI_SESSION);
		expect(screen.queryByText(/lbs volume/)).not.toBeInTheDocument();
	});

	it("still lets you edit an exercise from the workout view", async () => {
		renderWorkoutOnly(SINGLE_SESSION);
		await userEvent.click(
			screen.getByRole("button", { name: "Edit Bench Press" }),
		);
		expect(screen.getByTestId("edit-exercise-modal")).toBeInTheDocument();
	});
});

describe("DayDetail — steps sheet", () => {
	it("tapping the steps row opens the steps sheet for that entry", async () => {
		renderDetail(null);
		await userEvent.click(screen.getByRole("button", { name: "Edit steps" }));
		expect(screen.getByTestId("steps-modal").dataset.existingId).toBe("98");
	});

	it("+ Add steps opens an empty sheet for the day, which refreshes steps on save", async () => {
		const onRefetchS = vi.fn();
		render(
			<DayDetail
				date={DATE}
				weightEntry={null}
				nutritionEntry={null}
				workoutEntry={null}
				stepEntry={null}
				onRefetchW={vi.fn()}
				onRefetchN={vi.fn()}
				onRefetchWo={vi.fn()}
				onRefetchS={onRefetchS}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: "+ Add steps" }));
		const sheet = screen.getByTestId("steps-modal");
		expect(sheet.dataset.existingId).toBe("");
		expect(sheet.dataset.date).toBe(DATE);
		await userEvent.click(screen.getByRole("button", { name: "steps-save" }));
		expect(onRefetchS).toHaveBeenCalledTimes(1);
	});
});

describe("DayDetail — tap, swipe and ••• menus", () => {
	async function chooseFromMenu(menuName, item) {
		await userEvent.click(screen.getByRole("button", { name: menuName }));
		await userEvent.click(screen.getByRole("menuitem", { name: item }));
	}

	function renderWith(props = {}) {
		const refetch = {
			onRefetchW: vi.fn(),
			onRefetchN: vi.fn(),
			onRefetchWo: vi.fn(),
			onRefetchS: vi.fn(),
		};
		render(
			<DayDetail
				date={DATE}
				weightEntry={{ id: 99, logDate: DATE, weightLbs: 185 }}
				nutritionEntry={{ id: 7, logDate: DATE, meals: [] }}
				workoutEntry={SINGLE_SESSION}
				stepEntry={{ id: 98, logDate: DATE, steps: 8000 }}
				{...refetch}
				{...props}
			/>,
		);
		return refetch;
	}

	it("tapping the weight opens it for editing", async () => {
		renderWith();
		await userEvent.click(screen.getByRole("button", { name: "Edit weight" }));
		expect(screen.getByTestId("weight-modal")).toBeInTheDocument();
	});

	it("offers to add weight when the day has none", () => {
		renderWith({ weightEntry: null });
		expect(
			screen.getByRole("button", { name: /\+ add weight/i }),
		).toBeInTheDocument();
	});

	it("deletes the weight straight away and offers Undo", async () => {
		api.delete.mockResolvedValue({});
		const show = vi.spyOn(toast, "show");
		const { onRefetchW } = renderWith();

		await chooseFromMenu("More actions for Weight", "Delete");

		await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/weight/99"));
		expect(onRefetchW).toHaveBeenCalledTimes(1);
		expect(show).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Weight deleted" }),
		);
	});

	it("deletes steps, the workout, an exercise and the nutrition log", async () => {
		api.delete.mockResolvedValue({});
		const { onRefetchS, onRefetchWo, onRefetchN } = renderWith();

		await chooseFromMenu("More actions for Steps", "Delete");
		await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/steps/98"));
		expect(onRefetchS).toHaveBeenCalled();

		await chooseFromMenu("More actions for Bench Press", "Delete");
		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith("/workouts/10/exercises", {
				params: { name: "Bench Press" },
			}),
		);

		await chooseFromMenu("More actions for workout", "Delete workout");
		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith("/workouts/10"),
		);
		expect(onRefetchWo).toHaveBeenCalled();

		await chooseFromMenu("More actions for nutrition", "Delete nutrition log");
		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith("/nutrition/7"),
		);
		expect(onRefetchN).toHaveBeenCalled();
	});

	it("opens Edit day and Rename from the menus", async () => {
		renderWith();
		await chooseFromMenu("More actions for nutrition", "Edit day");
		expect(screen.getByTestId("dayinfo-modal")).toBeInTheDocument();

		await chooseFromMenu("More actions for workout", "Rename");
		expect(setRenamingSession).toHaveBeenCalledWith(true);
		expect(setRenameValue).toHaveBeenCalledWith("Push");
	});

	it("swaps the No workout row for + Add exercise once the day has a workout", () => {
		renderWith();
		expect(screen.queryByText("No workout")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /\+ Add exercise/i }),
		).toBeInTheDocument();
	});

	it("offers no deleting when showDelete is off", async () => {
		renderWith({ showDelete: false });
		await userEvent.click(
			screen.getByRole("button", { name: "More actions for workout" }),
		);
		expect(
			screen.queryByRole("menuitem", { name: "Delete workout" }),
		).not.toBeInTheDocument();
		for (const row of ["Weight", "Steps", "Bench Press"]) {
			expect(
				screen.queryByRole("button", { name: `More actions for ${row}` }),
			).not.toBeInTheDocument();
		}
		await userEvent.keyboard("{Escape}");
		await userEvent.click(
			screen.getByRole("button", { name: "More actions for nutrition" }),
		);
		expect(
			screen.queryByRole("menuitem", { name: "Delete nutrition log" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Edit weight" }),
		).toBeInTheDocument();
	});
});
