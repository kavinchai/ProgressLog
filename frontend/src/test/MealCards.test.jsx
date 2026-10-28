import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MealCards from "../components/MealCards";

vi.mock("../api", () => ({
	default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("../components/MealCards.css", () => ({}));
vi.mock("../components/Toast", () => ({
	useToast: () => ({ error: vi.fn(), show: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("../components/ConfirmDeleteModal", () => ({
	default: ({ title, onDelete, onClose }) => (
		<div data-testid="confirm-delete" data-title={title}>
			<button onClick={onDelete}>confirm</button>
			<button onClick={onClose}>cancel</button>
		</div>
	),
}));

import api from "../api";

const LOG_ID = 42;
const onSaved = vi.fn();
const getOrCreateNutritionLogId = vi.fn();

const logWith = (meals) => ({
	id: LOG_ID,
	logDate: "2026-10-28",
	dayType: "training",
	meals,
});

function setup(nutritionEntry = null) {
	return render(
		<MealCards
			nutritionEntry={nutritionEntry}
			getOrCreateNutritionLogId={getOrCreateNutritionLogId}
			onSaved={onSaved}
		/>,
	);
}

const card = (label) => screen.getByRole("group", { name: label });

beforeEach(() => {
	vi.clearAllMocks();
	getOrCreateNutritionLogId.mockResolvedValue(LOG_ID);
	api.post.mockResolvedValue({ data: logWith([]) });
	api.put.mockResolvedValue({ data: logWith([]) });
	api.delete.mockResolvedValue({});
});

describe("MealCards — fixed slots", () => {
	it("always shows Breakfast, Lunch and Dinner boxes, even with no log", () => {
		setup(null);
		for (const label of ["Breakfast", "Lunch", "Dinner"]) {
			expect(card(label)).toBeInTheDocument();
			expect(
				within(card(label)).getByRole("checkbox", { name: /skipped/i }),
			).not.toBeChecked();
		}
	});

	it("fills a slot from the meal with the matching label", () => {
		setup(
			logWith([
				{
					id: 1,
					mealLabel: "Breakfast",
					mealName: "Oatmeal & eggs",
					calories: 620,
					proteinGrams: 42,
				},
			]),
		);
		const b = within(card("Breakfast"));
		expect(b.getByRole("textbox", { name: /what you ate/i })).toHaveValue(
			"Oatmeal & eggs",
		);
		expect(b.getByRole("spinbutton", { name: /calories/i })).toHaveValue(620);
		expect(b.getByRole("spinbutton", { name: /protein/i })).toHaveValue(42);
	});

	it("creates the day log, then POSTs the slot meal when a field is left", async () => {
		setup(null);
		const b = within(card("Breakfast"));
		await userEvent.type(
			b.getByRole("textbox", { name: /what you ate/i }),
			"Bagel",
		);
		await userEvent.type(
			b.getByRole("spinbutton", { name: /calories/i }),
			"350",
		);
		await userEvent.tab();

		await waitFor(() =>
			expect(api.post).toHaveBeenLastCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Breakfast",
				mealName: "Bagel",
				calories: 350,
				proteinGrams: 0,
			}),
		);
		expect(getOrCreateNutritionLogId).toHaveBeenCalled();
		expect(onSaved).toHaveBeenCalled();
	});

	it("PUTs an existing slot meal when it is edited", async () => {
		setup(
			logWith([
				{
					id: 7,
					mealLabel: "Dinner",
					mealName: "Rice",
					calories: 500,
					proteinGrams: 20,
				},
			]),
		);
		const cal = within(card("Dinner")).getByRole("spinbutton", {
			name: /calories/i,
		});
		await userEvent.clear(cal);
		await userEvent.type(cal, "640");
		await userEvent.tab();

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/7`, {
				mealLabel: "Dinner",
				mealName: "Rice",
				calories: 640,
				proteinGrams: 20,
			}),
		);
		expect(api.post).not.toHaveBeenCalled();
	});

	it("does not save when nothing changed", async () => {
		setup(
			logWith([
				{
					id: 7,
					mealLabel: "Dinner",
					mealName: "Rice",
					calories: 500,
					proteinGrams: 20,
				},
			]),
		);
		await userEvent.click(
			within(card("Dinner")).getByRole("textbox", { name: /what you ate/i }),
		);
		await userEvent.tab();
		expect(api.put).not.toHaveBeenCalled();
		expect(api.post).not.toHaveBeenCalled();
	});
});

describe("MealCards — skipping a meal", () => {
	it('ticking Skipped saves "Skipped Lunch" with 0 kcal and 0 g', async () => {
		setup(logWith([]));
		await userEvent.click(
			within(card("Lunch")).getByRole("checkbox", { name: /skipped/i }),
		);
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Lunch",
				mealName: "Skipped Lunch",
				calories: 0,
				proteinGrams: 0,
			}),
		);
	});

	it("a skipped meal shows a summary instead of inputs", () => {
		setup(
			logWith([
				{
					id: 3,
					mealLabel: "Lunch",
					mealName: "Skipped Lunch",
					calories: 0,
					proteinGrams: 0,
				},
			]),
		);
		const l = within(card("Lunch"));
		expect(l.getByRole("checkbox", { name: /skipped/i })).toBeChecked();
		expect(l.getByText(/skipped lunch/i)).toBeInTheDocument();
		expect(l.queryByRole("spinbutton")).not.toBeInTheDocument();
	});

	it("unticking Skipped removes the skipped entry", async () => {
		setup(
			logWith([
				{
					id: 3,
					mealLabel: "Lunch",
					mealName: "Skipped Lunch",
					calories: 0,
					proteinGrams: 0,
				},
			]),
		);
		await userEvent.click(
			within(card("Lunch")).getByRole("checkbox", { name: /skipped/i }),
		);
		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/3`),
		);
		expect(
			within(card("Lunch")).getByRole("spinbutton", { name: /calories/i }),
		).toBeInTheDocument();
	});
});

describe("MealCards — extra meals", () => {
	it("shows meals without a slot label as editable, deletable extra boxes", () => {
		setup(
			logWith([
				{
					id: 9,
					mealLabel: "Snack",
					mealName: "Protein bar",
					calories: 300,
					proteinGrams: 23,
				},
			]),
		);
		const s = within(card("Snack"));
		expect(s.getByRole("textbox", { name: /meal label/i })).toHaveValue(
			"Snack",
		);
		expect(s.getByRole("button", { name: /delete meal/i })).toBeInTheDocument();
		expect(
			within(card("Breakfast")).queryByRole("button", { name: /delete meal/i }),
		).not.toBeInTheDocument();
	});

	it("+ Add meal adds a box with its label field focused first", async () => {
		setup(logWith([]));
		await userEvent.click(screen.getByRole("button", { name: /\+ add meal/i }));
		const label = screen.getByRole("textbox", { name: /meal label/i });
		expect(label).toHaveFocus();
		expect(label).toHaveValue("");
	});

	it("Enter in the label field moves to what you ate", async () => {
		setup(logWith([]));
		await userEvent.click(screen.getByRole("button", { name: /\+ add meal/i }));
		await userEvent.type(
			screen.getByRole("textbox", { name: /meal label/i }),
			"Pre-workout{Enter}",
		);
		const extra = within(card("Pre-workout"));
		expect(extra.getByRole("textbox", { name: /what you ate/i })).toHaveFocus();
	});

	it("saves a new extra meal once, then updates the same meal", async () => {
		api.post.mockResolvedValueOnce({
			data: logWith([
				{
					id: 77,
					mealLabel: "Snack",
					mealName: null,
					calories: 0,
					proteinGrams: 0,
				},
			]),
		});
		setup(logWith([]));
		await userEvent.click(screen.getByRole("button", { name: /\+ add meal/i }));
		await userEvent.type(
			screen.getByRole("textbox", { name: /meal label/i }),
			"Snack",
		);
		await userEvent.tab(); // leave label → first save
		await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
		expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
			mealLabel: "Snack",
			mealName: null,
			calories: 0,
			proteinGrams: 0,
		});

		const cal = within(card("Snack")).getByRole("spinbutton", {
			name: /calories/i,
		});
		await userEvent.type(cal, "300");
		await userEvent.tab();
		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/77`, {
				mealLabel: "Snack",
				mealName: null,
				calories: 300,
				proteinGrams: 0,
			}),
		);
		expect(api.post).toHaveBeenCalledTimes(1);
	});

	it("deleting a saved extra meal goes through the delete-with-undo dialog", async () => {
		setup(
			logWith([
				{
					id: 9,
					mealLabel: "Snack",
					mealName: "Protein bar",
					calories: 300,
					proteinGrams: 23,
				},
			]),
		);
		await userEvent.click(
			within(card("Snack")).getByRole("button", { name: /delete meal/i }),
		);
		expect(screen.getByTestId("confirm-delete").dataset.title).toBe(
			"Delete Meal",
		);
		await userEvent.click(screen.getByRole("button", { name: "confirm" }));
		await waitFor(() =>
			expect(api.delete).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/9`),
		);
	});

	it("deleting an unsaved extra box removes it without a request", async () => {
		setup(logWith([]));
		await userEvent.click(screen.getByRole("button", { name: /\+ add meal/i }));
		await userEvent.click(screen.getByRole("button", { name: /delete meal/i }));
		expect(
			screen.queryByRole("textbox", { name: /meal label/i }),
		).not.toBeInTheDocument();
		expect(api.delete).not.toHaveBeenCalled();
		expect(screen.queryByTestId("confirm-delete")).not.toBeInTheDocument();
	});
});
