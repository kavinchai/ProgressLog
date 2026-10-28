import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "../api";
import { useToast } from "./Toast";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import "./MealCards.css";

// Breakfast / Lunch / Dinner are always shown; any other meal is an "extra"
// box with an editable label. Every box saves itself when a field is left.
const SLOTS = ["Breakfast", "Lunch", "Dinner"];

const sameLabel = (a, b) =>
	(a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

const toInt = (v) => {
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? 0 : n;
};

function fieldsFrom(meal, slot) {
	return {
		label: meal?.mealLabel ?? slot ?? "",
		name: meal?.mealName ?? "",
		calories: meal?.calories ?? "",
		protein: meal?.proteinGrams ?? "",
	};
}

function bodyFrom(fields, slot) {
	return {
		mealLabel: slot ?? (fields.label.trim() || null),
		mealName: fields.name.trim() || null,
		calories: toInt(fields.calories),
		proteinGrams: toInt(fields.protein),
	};
}

function MealCard({
	slot,
	meal,
	autoFocusLabel,
	saveMeal,
	removeMeal,
	onCreated,
	onDelete,
}) {
	const toast = useToast();
	const [fields, setFields] = useState(() => fieldsFrom(meal, slot));
	const [status, setStatus] = useState(null); // "saving" | "saved" | null
	const fieldsRef = useRef(fields);
	const savedRef = useRef(fieldsFrom(meal, slot));
	const idRef = useRef(meal?.id ?? null);
	const editingRef = useRef(false);
	const queueRef = useRef(Promise.resolve());
	const nameRef = useRef(null);

	// Pick up refetched data (e.g. after undo) unless the user is mid-edit.
	useEffect(() => {
		if (meal?.id) idRef.current = meal.id;
		if (editingRef.current) return;
		const next = fieldsFrom(meal, slot);
		savedRef.current = next;
		fieldsRef.current = next;
		setFields(next);
	}, [meal, slot]);

	function update(patch) {
		const next = { ...fieldsRef.current, ...patch };
		fieldsRef.current = next;
		setFields(next);
		return next;
	}

	function commit(next = fieldsRef.current) {
		queueRef.current = queueRef.current.then(async () => {
			const body = bodyFrom(next, slot);
			const saved = bodyFrom(savedRef.current, slot);
			const blank =
				!idRef.current &&
				!body.mealName &&
				next.calories === "" &&
				next.protein === "" &&
				(slot || !body.mealLabel);
			if (blank || JSON.stringify(body) === JSON.stringify(saved)) return;
			setStatus("saving");
			try {
				const id = await saveMeal(idRef.current, body);
				if (id && !idRef.current) {
					idRef.current = id;
					onCreated?.(id);
				}
				savedRef.current = next;
				setStatus("saved");
			} catch {
				toast.error("Failed to save meal");
				setStatus(null);
			}
		});
	}

	async function toggleSkipped(checked) {
		if (checked) {
			commit(update({ name: `Skipped ${slot}`, calories: 0, protein: 0 }));
			return;
		}
		const blank = update({ name: "", calories: "", protein: "" });
		savedRef.current = blank;
		if (idRef.current) {
			const id = idRef.current;
			idRef.current = null;
			try {
				await removeMeal(id);
			} catch {
				toast.error("Failed to save meal");
			}
		}
		setStatus(null);
	}

	const skipped = slot && fields.name === `Skipped ${slot}`;
	const groupName = slot ?? (fields.label.trim() || "New meal");

	return (
		<div
			role="group"
			aria-label={groupName}
			className={"meal-card" + (skipped ? " meal-card--skipped" : "")}
			onFocus={() => (editingRef.current = true)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget)) {
					editingRef.current = false;
				}
			}}
		>
			<div className="meal-card-head">
				{slot ? (
					<span className="meal-card-label">{slot}</span>
				) : (
					<input
						className="meal-card-label meal-card-label-input"
						type="text"
						placeholder="Name this meal"
						aria-label="Meal label"
						maxLength={50}
						value={fields.label}
						autoFocus={autoFocusLabel}
						onChange={(e) => update({ label: e.target.value })}
						onBlur={() => commit()}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								nameRef.current?.focus();
							}
						}}
					/>
				)}
				<div className="meal-card-actions">
					{status && (
						<span className="meal-card-status">
							{status === "saving" ? "Saving…" : "Saved"}
						</span>
					)}
					{slot ? (
						<label className="meal-card-skip">
							<input
								type="checkbox"
								checked={!!skipped}
								onChange={(e) => toggleSkipped(e.target.checked)}
							/>
							Skipped
						</label>
					) : (
						<button
							type="button"
							className="meal-card-delete"
							aria-label="Delete meal"
							onClick={() => onDelete(idRef.current)}
						>
							<Trash2 size={16} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>

			{skipped ? (
				<span className="meal-card-skipped-text">
					Skipped {slot} · 0 kcal · 0 g
				</span>
			) : (
				<div className="meal-card-fields">
					<input
						ref={nameRef}
						className="modal-input meal-card-name"
						type="text"
						placeholder="What did you eat?"
						aria-label="What you ate"
						maxLength={100}
						value={fields.name}
						onChange={(e) => update({ name: e.target.value })}
						onBlur={() => commit()}
						onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
					/>
					<div className="meal-card-unit">
						<input
							className="modal-input"
							type="number"
							min="0"
							placeholder="0"
							aria-label="Calories"
							value={fields.calories}
							onChange={(e) => update({ calories: e.target.value })}
							onBlur={() => commit()}
							onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
						/>
						<span aria-hidden="true">kcal</span>
					</div>
					<div className="meal-card-unit">
						<input
							className="modal-input"
							type="number"
							min="0"
							placeholder="0"
							aria-label="Protein (g)"
							value={fields.protein}
							onChange={(e) => update({ protein: e.target.value })}
							onBlur={() => commit()}
							onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
						/>
						<span aria-hidden="true">g</span>
					</div>
				</div>
			)}
		</div>
	);
}

export default function MealCards({
	nutritionEntry,
	getOrCreateNutritionLogId,
	onSaved,
}) {
	const meals = nutritionEntry?.meals ?? [];
	const [drafts, setDrafts] = useState([]); // [{ key, mealId }]
	const [confirmDelete, setConfirmDelete] = useState(null);
	const nextKeyRef = useRef(0);
	const logIdRef = useRef(nutritionEntry?.id ?? null);
	if (nutritionEntry?.id) logIdRef.current = nutritionEntry.id;

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
		const logId = logIdRef.current ?? (await getOrCreateNutritionLogId());
		if (!logId) throw new Error("No nutrition log");
		logIdRef.current = logId;
		if (mealId) {
			await api.put(`/nutrition/${logId}/meals/${mealId}`, body);
			onSaved();
			return mealId;
		}
		const res = await api.post(`/nutrition/${logId}/meals`, body);
		onSaved();
		// IDs are sequential, so the new meal is the highest one in the log.
		const ids = (res.data?.meals ?? []).map((m) => m.id);
		return ids.length ? Math.max(...ids) : null;
	}

	async function removeMeal(mealId) {
		await api.delete(`/nutrition/${logIdRef.current}/meals/${mealId}`);
		onSaved();
	}

	function addMeal() {
		const key = `draft-${nextKeyRef.current++}`;
		setDrafts((d) => [...d, { key, mealId: null }]);
	}

	function requestDelete(key, mealId) {
		const dropDraft = () => setDrafts((d) => d.filter((x) => x.key !== key));
		if (!mealId) {
			dropDraft();
			return;
		}
		setConfirmDelete({
			onDelete: () =>
				api
					.delete(`/nutrition/${logIdRef.current}/meals/${mealId}`)
					.then(() => {
						dropDraft();
						onSaved();
					}),
		});
	}

	// Saved extras keep the key of the draft box they were typed into, so the
	// box isn't remounted (and doesn't lose focus) when the refetch lands.
	const extraRows = [
		...extraMeals.map((m) => ({
			key: drafts.find((d) => d.mealId === m.id)?.key ?? `meal-${m.id}`,
			meal: m,
		})),
		...drafts
			.filter((d) => !extraMeals.some((m) => m.id === d.mealId))
			.map((d) => ({ key: d.key, meal: null, autoFocus: !d.mealId })),
	];

	return (
		<div className="meal-cards">
			{SLOTS.map((slot) => (
				<MealCard
					key={slot}
					slot={slot}
					meal={slotMeals[slot] ?? null}
					saveMeal={saveMeal}
					removeMeal={removeMeal}
				/>
			))}
			{extraRows.map((row) => (
				<MealCard
					key={row.key}
					meal={row.meal}
					autoFocusLabel={row.autoFocus}
					saveMeal={saveMeal}
					removeMeal={removeMeal}
					onCreated={(id) =>
						setDrafts((d) =>
							d.map((x) => (x.key === row.key ? { ...x, mealId: id } : x)),
						)
					}
					onDelete={(mealId) => requestDelete(row.key, mealId)}
				/>
			))}
			<button type="button" className="meal-card-add" onClick={addMeal}>
				+ Add meal
			</button>

			{confirmDelete && (
				<ConfirmDeleteModal
					title="Delete Meal"
					message="Are you sure you want to delete this meal?"
					onClose={() => setConfirmDelete(null)}
					onDelete={confirmDelete.onDelete}
					onUndone={() => {
						onSaved();
						setConfirmDelete(null);
					}}
				/>
			)}
		</div>
	);
}
