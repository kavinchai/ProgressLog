import { useId, useState } from "react";
import { tapSuccess } from "../native/haptics";
import Modal from "./Modal";
import SheetField from "./SheetField";

const skippedName = (slot) => `Skipped ${slot}`;

const toInt = (v) => {
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? 0 : n;
};

// A skipped meal opens ticked with blank fields; untick to log what you ate.
function fieldsFrom(meal, slot) {
	const skipped = Boolean(slot) && meal?.mealName === skippedName(slot);
	return {
		skipped,
		label: meal?.mealLabel ?? "",
		name: skipped ? "" : (meal?.mealName ?? ""),
		restaurant: skipped ? "" : (meal?.restaurant ?? ""),
		calories: skipped ? "" : String(meal?.calories ?? ""),
		protein: skipped ? "" : String(meal?.proteinGrams ?? ""),
	};
}

// A blank restaurant is left out, which the backend stores as none.
function bodyFrom(fields, slot) {
	if (fields.skipped) {
		return {
			mealLabel: slot,
			mealName: skippedName(slot),
			calories: 0,
			proteinGrams: 0,
		};
	}
	const restaurant = fields.restaurant.trim();
	return {
		mealLabel: slot ?? (fields.label.trim() || null),
		mealName: fields.name.trim() || null,
		...(restaurant && { restaurant }),
		calories: toInt(fields.calories),
		proteinGrams: toInt(fields.protein),
	};
}

/**
 * Add or edit one meal. Breakfast / Lunch / Dinner (`slot`) get a "Skipped"
 * tick box; any other meal gets a name field instead.
 */
export default function MealSheet({
	slot,
	meal,
	restaurants,
	onSave,
	onClose,
}) {
	const formId = useId();
	const restaurantListId = useId();
	const [fields, setFields] = useState(() => fieldsFrom(meal, slot));
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState("");
	const update = (patch) => setFields((f) => ({ ...f, ...patch }));

	async function save(body) {
		if (saving) return;
		setSaving(true);
		setErr("");
		try {
			await onSave(meal?.id ?? null, body);
			tapSuccess();
			onClose();
		} catch {
			setErr("Couldn't save. Try again.");
			setSaving(false);
		}
	}

	function submit(e) {
		e.preventDefault();
		const body = bodyFrom(fields, slot);
		const empty =
			!body.mealName &&
			fields.calories === "" &&
			fields.protein === "" &&
			(slot || !body.mealLabel);
		const unchanged =
			meal &&
			JSON.stringify(body) ===
				JSON.stringify(bodyFrom(fieldsFrom(meal, slot), slot));
		if ((empty && !meal) || unchanged) {
			onClose();
			return;
		}
		save(body);
	}

	const title = slot ?? (meal ? meal.mealLabel || "Meal" : "Add meal");

	return (
		<Modal title={title} onClose={onClose} form={{ id: formId, saving }}>
			<form id={formId} className="modal-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}
				{slot && (
					<label className="sheet-group sheet-check">
						<input
							type="checkbox"
							className="sheet-check-box"
							checked={fields.skipped}
							disabled={saving}
							onChange={(e) => update({ skipped: e.target.checked })}
						/>
						Skipped {slot.toLowerCase()}
					</label>
				)}
				<fieldset className="sheet-group" disabled={fields.skipped}>
					{!slot && (
						<SheetField
							label="Name"
							inputLabel="Meal name"
							placeholder="Snack"
							maxLength={50}
							value={fields.label}
							onChange={(e) => update({ label: e.target.value })}
						/>
					)}
					<SheetField
						label="What"
						inputLabel="What you ate"
						placeholder="Chicken and rice"
						maxLength={100}
						value={fields.name}
						onChange={(e) => update({ name: e.target.value })}
					/>
					<SheetField
						label="Where"
						inputLabel="Restaurant"
						placeholder="Optional"
						maxLength={100}
						list={restaurantListId}
						value={fields.restaurant}
						onChange={(e) => update({ restaurant: e.target.value })}
					/>
					<SheetField
						label="Calories"
						type="number"
						inputMode="numeric"
						min="0"
						placeholder="0"
						unit="kcal"
						value={fields.calories}
						onChange={(e) => update({ calories: e.target.value })}
					/>
					<SheetField
						label="Protein"
						inputLabel="Protein (g)"
						type="number"
						inputMode="numeric"
						min="0"
						placeholder="0"
						unit="g"
						value={fields.protein}
						onChange={(e) => update({ protein: e.target.value })}
					/>
				</fieldset>
				<datalist id={restaurantListId}>
					{restaurants.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>
			</form>
		</Modal>
	);
}
