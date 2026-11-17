import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MealCards from "../components/MealCards";

vi.mock("../api", () => ({
	default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("../components/MealCards.css", () => ({}));
vi.mock("../native/haptics", () => ({
	tapSuccess: vi.fn(),
	tapDelete: vi.fn(),
	tapLight: vi.fn(),
}));
// One shared toast stub so tests can check the Undo bar.
const toast = vi.hoisted(() => ({
	error: () => {},
	show: () => 1,
	dismiss: () => {},
}));
vi.mock("../components/Toast", () => ({ useToast: () => toast }));

import api from "../api";
import { tapSuccess } from "../native/haptics";

const LOG_ID = 42;
const onSaved = vi.fn();
const getOrCreateNutritionLogId = vi.fn();

const logWith = (meals) => ({
	id: LOG_ID,
	logDate: "2026-10-28",
	dayType: "training",
	meals,
});

const BREAKFAST = {
	id: 1,
	mealLabel: "Breakfast",
	mealName: "Oatmeal and eggs",
	calories: 620,
	proteinGrams: 42,
};
const SKIPPED_LUNCH = {
	id: 3,
	mealLabel: "Lunch",
	mealName: "Skipped Lunch",
	calories: 0,
	proteinGrams: 0,
};
const SNACK = {
	id: 9,
	mealLabel: "Snack",
	mealName: "Protein bar",
	calories: 300,
	proteinGrams: 23,
};

function setup(nutritionEntry = null, nutritionData) {
	return render(
		<MealCards
			nutritionEntry={nutritionEntry}
			nutritionData={nutritionData}
			getOrCreateNutritionLogId={getOrCreateNutritionLogId}
			onSaved={onSaved}
		/>,
	);
}

const button = (name) => screen.getByRole("button", { name });
const sheet = () => within(screen.getByRole("dialog"));
const field = (name) => sheet().getByLabelText(name);

async function fillSheet(values) {
	for (const [name, value] of Object.entries(values)) {
		await userEvent.clear(field(name));
		if (value !== "") await userEvent.type(field(name), value);
	}
}

async function save() {
	await userEvent.click(sheet().getByRole("button", { name: /^save$/i }));
}

beforeEach(() => {
	vi.clearAllMocks();
	getOrCreateNutritionLogId.mockResolvedValue(LOG_ID);
	api.post.mockResolvedValue({ data: logWith([]) });
	api.put.mockResolvedValue({ data: logWith([]) });
	api.delete.mockResolvedValue({});
});

describe("MealCards — rows", () => {
	it("always lists Breakfast, Lunch and Dinner, each with + Add when empty", () => {
		setup(null);
		for (const slot of ["Breakfast", "Lunch", "Dinner"]) {
			expect(button(`+ Add ${slot}`)).toHaveTextContent(slot);
		}
		expect(button("+ Add meal")).toBeInTheDocument();
	});

	it("shows a logged meal as one line: what, kcal and protein", () => {
		setup(logWith([BREAKFAST]));
		const row = button("Edit Breakfast");
		expect(row).toHaveTextContent("Oatmeal and eggs · 620 kcal · 42 g");
		expect(
			screen.queryByRole("button", { name: "+ Add Breakfast" }),
		).not.toBeInTheDocument();
	});

	it("shows a skipped meal as Skipped", () => {
		setup(logWith([SKIPPED_LUNCH]));
		const row = button("Edit Lunch");
		expect(row).toHaveTextContent("Skipped");
		expect(row).not.toHaveTextContent("0 kcal");
	});

	it("lists extra meals under their own label", () => {
		setup(logWith([SNACK]));
		expect(button("Edit Snack")).toHaveTextContent(
			"Protein bar · 300 kcal · 23 g",
		);
	});

	it("has no inline inputs; meals are edited in a sheet", () => {
		setup(logWith([BREAKFAST]));
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("MealCards — adding and editing in the sheet", () => {
	it("+ Add Breakfast opens an empty Breakfast sheet", async () => {
		setup(null);
		await userEvent.click(button("+ Add Breakfast"));
		expect(
			screen.getByRole("dialog", { name: "Breakfast" }),
		).toBeInTheDocument();
		expect(field("What you ate")).toHaveValue("");
		expect(sheet().queryByLabelText("Meal name")).not.toBeInTheDocument();
	});

	it("creates the day log, then POSTs the meal on Save and closes", async () => {
		setup(null);
		await userEvent.click(button("+ Add Breakfast"));
		await fillSheet({ "What you ate": "Bagel", Calories: "350" });
		await save();

		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Breakfast",
				mealName: "Bagel",
				calories: 350,
				proteinGrams: 0,
			}),
		);
		expect(getOrCreateNutritionLogId).toHaveBeenCalled();
		expect(onSaved).toHaveBeenCalled();
		expect(tapSuccess).toHaveBeenCalledTimes(1);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("tapping a logged meal opens it filled in, and Save PUTs the change", async () => {
		setup(logWith([{ ...BREAKFAST, mealLabel: "Dinner", id: 7 }]));
		await userEvent.click(button("Edit Dinner"));
		expect(field("What you ate")).toHaveValue("Oatmeal and eggs");
		expect(field("Protein (g)")).toHaveValue(42);
		await fillSheet({ Calories: "640" });
		await save();

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/7`, {
				mealLabel: "Dinner",
				mealName: "Oatmeal and eggs",
				calories: 640,
				proteinGrams: 42,
			}),
		);
		expect(api.post).not.toHaveBeenCalled();
		expect(getOrCreateNutritionLogId).not.toHaveBeenCalled();
	});

	it("Save with nothing changed just closes", async () => {
		setup(logWith([BREAKFAST]));
		await userEvent.click(button("Edit Breakfast"));
		await save();
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(api.put).not.toHaveBeenCalled();
		expect(api.post).not.toHaveBeenCalled();
	});

	it("Save on an empty new meal just closes", async () => {
		setup(null);
		await userEvent.click(button("+ Add Dinner"));
		await save();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalled();
	});

	it("Cancel closes without saving", async () => {
		setup(null);
		await userEvent.click(button("+ Add Dinner"));
		await fillSheet({ "What you ate": "Pasta" });
		await userEvent.click(sheet().getByRole("button", { name: "Cancel" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalled();
	});

	it("keeps the sheet open with a message when saving fails", async () => {
		api.post.mockRejectedValueOnce(new Error("500"));
		setup(null);
		await userEvent.click(button("+ Add Lunch"));
		await fillSheet({ "What you ate": "Soup" });
		await save();
		expect(await sheet().findByText(/couldn't save/i)).toBeInTheDocument();
		expect(onSaved).not.toHaveBeenCalled();
	});
});

describe("MealCards — skipping a meal", () => {
	it('Mark as skipped saves "Skipped Lunch" with 0 kcal and 0 g', async () => {
		setup(logWith([]));
		await userEvent.click(button("+ Add Lunch"));
		await userEvent.click(
			sheet().getByRole("button", { name: "Mark as skipped" }),
		);
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Lunch",
				mealName: "Skipped Lunch",
				calories: 0,
				proteinGrams: 0,
			}),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("skipping a logged meal drops its restaurant", async () => {
		setup(logWith([{ ...BREAKFAST, mealLabel: "Lunch", restaurant: "Cava" }]));
		await userEvent.click(button("Edit Lunch"));
		await userEvent.click(
			sheet().getByRole("button", { name: "Mark as skipped" }),
		);
		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/1`, {
				mealLabel: "Lunch",
				mealName: "Skipped Lunch",
				calories: 0,
				proteinGrams: 0,
			}),
		);
	});

	it("opening a skipped meal starts blank, so you can log what you ate", async () => {
		setup(logWith([SKIPPED_LUNCH]));
		await userEvent.click(button("Edit Lunch"));
		expect(field("What you ate")).toHaveValue("");
		await fillSheet({ "What you ate": "Wrap", Calories: "500" });
		await save();
		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/3`, {
				mealLabel: "Lunch",
				mealName: "Wrap",
				calories: 500,
				proteinGrams: 0,
			}),
		);
	});

	it("extra meals can't be marked as skipped", async () => {
		setup(logWith([SNACK]));
		await userEvent.click(button("Edit Snack"));
		expect(
			sheet().queryByRole("button", { name: "Mark as skipped" }),
		).not.toBeInTheDocument();
	});
});

describe("MealCards — extra meals", () => {
	it("+ Add meal opens a sheet with a name field", async () => {
		setup(logWith([]));
		await userEvent.click(button("+ Add meal"));
		expect(
			screen.getByRole("dialog", { name: "Add meal" }),
		).toBeInTheDocument();
		expect(field("Meal name")).toHaveValue("");
	});

	it("saves a new extra meal with its name as the label", async () => {
		setup(logWith([]));
		await userEvent.click(button("+ Add meal"));
		await fillSheet({ "Meal name": "Snack", Calories: "300" });
		await save();
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Snack",
				mealName: null,
				calories: 300,
				proteinGrams: 0,
			}),
		);
	});

	it("shows an extra meal with no name as Meal, with a restaurant field", async () => {
		setup(logWith([{ ...SNACK, mealLabel: null }]));
		await userEvent.click(button("Edit Meal"));
		expect(
			sheet().getByRole("combobox", { name: /restaurant/i }),
		).toBeInTheDocument();
	});

	it("saves only once if Save is pressed twice quickly", async () => {
		api.post.mockReturnValue(new Promise(() => {}));
		setup(logWith([]));
		await userEvent.click(button("+ Add Lunch"));
		await fillSheet({ "What you ate": "Soup" });
		await save();
		await userEvent.click(
			sheet().getByRole("button", { name: "Mark as skipped" }),
		);
		expect(api.post).toHaveBeenCalledTimes(1);
		expect(sheet().getByRole("button", { name: "Saving…" })).toBeDisabled();
	});

	it("renaming an extra meal PUTs the new label", async () => {
		setup(logWith([SNACK]));
		await userEvent.click(button("Edit Snack"));
		expect(field("Meal name")).toHaveValue("Snack");
		await fillSheet({ "Meal name": "Pre-workout" });
		await save();
		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/9`, {
				mealLabel: "Pre-workout",
				mealName: "Protein bar",
				calories: 300,
				proteinGrams: 23,
			}),
		);
	});
});

describe("MealCards — deleting", () => {
	it.each([
		["an extra meal", SNACK, "Snack"],
		["a slot meal", BREAKFAST, "Breakfast"],
	])(
		"deleting %s from its menu deletes it straight away, with Undo",
		async (_, meal, label) => {
			setup(logWith([meal]));
			const show = vi.spyOn(toast, "show");
			await userEvent.click(button(`More actions for ${label}`));
			await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
			await waitFor(() =>
				expect(api.delete).toHaveBeenCalledWith(
					`/nutrition/${LOG_ID}/meals/${meal.id}`,
				),
			);
			await waitFor(() => expect(onSaved).toHaveBeenCalled());
			expect(show).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Meal deleted",
					action: expect.objectContaining({ label: "Undo" }),
				}),
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		},
	);
});

describe("MealCards — restaurant", () => {
	const lunch = (restaurant) => ({
		id: 9,
		mealLabel: "Lunch",
		mealName: "Burrito bowl",
		restaurant,
		calories: 900,
		proteinGrams: 50,
	});
	const restaurantField = () =>
		sheet().getByRole("combobox", { name: /restaurant/i });

	it("shows the saved restaurant in the sheet", async () => {
		setup(logWith([lunch("Chipotle")]));
		await userEvent.click(button("Edit Lunch"));
		expect(restaurantField()).toHaveValue("Chipotle");
	});

	it("saves a new meal with its restaurant, trimmed", async () => {
		setup(null);
		await userEvent.click(button("+ Add Breakfast"));
		await fillSheet({
			Restaurant: "  Starbucks ",
			"What you ate": "Egg bites",
		});
		await save();
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
				mealLabel: "Breakfast",
				mealName: "Egg bites",
				restaurant: "Starbucks",
				calories: 0,
				proteinGrams: 0,
			}),
		);
	});

	it("clearing the restaurant saves the meal without one", async () => {
		setup(logWith([lunch("Chipotle")]));
		await userEvent.click(button("Edit Lunch"));
		await userEvent.clear(restaurantField());
		await save();
		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/9`, {
				mealLabel: "Lunch",
				mealName: "Burrito bowl",
				calories: 900,
				proteinGrams: 50,
			}),
		);
	});

	it("a restaurant alone on an empty new meal does not save", async () => {
		setup(null);
		await userEvent.click(button("+ Add Breakfast"));
		await fillSheet({ Restaurant: "Starbucks" });
		await save();
		expect(api.post).not.toHaveBeenCalled();
	});

	it("suggests restaurants used before, once each, in A–Z order", async () => {
		setup(null, [
			logWith([lunch("Chipotle"), { ...lunch("cava"), id: 10 }]),
			{
				...logWith([
					{ ...lunch("Chipotle"), id: 11 },
					{ ...lunch(""), id: 12 },
				]),
				id: 43,
			},
			{ ...logWith([{ ...lunch(null), id: 13 }]), id: 44 },
		]);
		await userEvent.click(button("+ Add Breakfast"));
		const list = document.getElementById(
			restaurantField().getAttribute("list"),
		);
		expect([...list.querySelectorAll("option")].map((o) => o.value)).toEqual([
			"cava",
			"Chipotle",
		]);
	});
});
