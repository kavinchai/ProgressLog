import { CirclePlus } from "lucide-react";
import { useState } from "react";
import api from "../api";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";
import SwipeRow from "./SwipeRow";
import StatusRow, { AddRow } from "./StatusRow";
import MealSheet from "./MealSheet";

// Breakfast / Lunch / Dinner always have a row; any other meal is an "extra"
// row under its own label. Tapping a row (or + Add) opens the meal sheet.
const SLOTS = ["Breakfast", "Lunch", "Dinner"];

const sameLabel = (a, b) =>
	(a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

function mealDetail(meal) {
	return [
		meal.mealName,
		`${(meal.calories ?? 0).toLocaleString()} kcal`,
		`${meal.proteinGrams ?? 0} g`,
	]
		.filter(Boolean)
		.join(" · ");
}

// Restaurants from every logged meal, once each (ignoring case), A–Z.
function pastRestaurants(nutritionData) {
	const byKey = new Map();
	for (const log of nutritionData ?? []) {
		for (const m of log.meals ?? []) {
			const name = m.restaurant?.trim();
			if (name && !byKey.has(name.toLowerCase())) {
				byKey.set(name.toLowerCase(), name);
			}
		}
	}
	return [...byKey.values()].sort((a, b) =>
		a.localeCompare(b, undefined, { sensitivity: "base" }),
	);
}

export default function MealCards({
	nutritionEntry,
	nutritionData,
	getOrCreateNutritionLogId,
	onSaved,
}) {
	const meals = nutritionEntry?.meals ?? [];
	const [editing, setEditing] = useState(null); // { slot, meal }
	const deleteWithUndo = useDeleteWithUndo();

	// First meal labelled after each slot fills it; everything else is extra.
	const used = new Set();
	const slotMeals = {};
	for (const slot of SLOTS) {
		const m = meals.find(
			(x) => !used.has(x.id) && sameLabel(x.mealLabel, slot),
		);
		if (m) {
			slotMeals[slot] = m;
			used.add(m.id);
		}
	}
	const extraMeals = meals.filter((m) => !used.has(m.id));

	async function saveMeal(mealId, body) {
		const logId = nutritionEntry?.id ?? (await getOrCreateNutritionLogId());
		if (!logId) throw new Error("No nutrition log");
		if (mealId) await api.put(`/nutrition/${logId}/meals/${mealId}`, body);
		else await api.post(`/nutrition/${logId}/meals`, body);
		onSaved();
	}

	function mealRow(title, slot, meal) {
		const skipped = slot && meal.mealName === `Skipped ${slot}`;
		return (
			<SwipeRow
				key={meal.id}
				label={title}
				openLabel={`Edit ${title}`}
				className="meal-row"
				onOpen={() => setEditing({ slot, meal })}
				onDelete={() =>
					deleteWithUndo({
						remove: () =>
							api.delete(`/nutrition/${nutritionEntry.id}/meals/${meal.id}`),
						message: "Meal deleted",
						refresh: onSaved,
					})
				}
			>
				<StatusRow
					status={skipped ? "skipped" : "done"}
					title={title}
					detail={skipped ? "Skipped" : mealDetail(meal)}
				/>
			</SwipeRow>
		);
	}

	return (
		<div className="meal-rows status-rows">
			{SLOTS.map((slot) =>
				slotMeals[slot] ? (
					mealRow(slot, slot, slotMeals[slot])
				) : (
					<AddRow
						key={slot}
						title={slot}
						label={`+ Add ${slot}`}
						className="meal-row"
						onClick={() => setEditing({ slot, meal: null })}
					/>
				),
			)}
			{extraMeals.map((m) => mealRow(m.mealLabel || "Meal", null, m))}
			<div className="status-rows-footer">
				<button
					type="button"
					className="status-add-chip"
					onClick={() => setEditing({ slot: null, meal: null })}
				>
					<CirclePlus size={20} aria-hidden="true" />
					Add meal
				</button>
			</div>
			{editing && (
				<MealSheet
					slot={editing.slot}
					meal={editing.meal}
					restaurants={pastRestaurants(nutritionData)}
					onSave={saveMeal}
					onClose={() => setEditing(null)}
				/>
			)}
		</div>
	);
}
