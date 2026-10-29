// Where a meal logged through Claude goes in the day.
//
// Breakfast / Lunch / Dinner are fixed slots in the app (one box each), so
// logging one fills that day's existing slot rather than adding a duplicate.
// Any other meal type the user names ("snack", "pre-workout") becomes a new
// meal labelled with it. With no meal type, a breakfast / lunch / dinner
// named in the meal name picks the slot; otherwise it's a new unlabelled meal.

const SLOT_LABELS = ["Breakfast", "Lunch", "Dinner"];

const slotFor = (label) =>
	SLOT_LABELS.find((s) => s.toLowerCase() === label?.trim().toLowerCase()) ??
	null;

// "breakfast" → "Breakfast", "snack" → "Snack", blank → null.
export function normalizeLabel(label) {
	const trimmed = label?.trim();
	if (!trimmed) return null;
	return slotFor(trimmed) ?? trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const LEADING_SLOT = /^\s*(breakfast|lunch|dinner)\b[\s:\-–—]*/i;
const ANY_SLOT = /\b(breakfast|lunch|dinner)\b/i;

// When no meal type came through, read one from the name: "Dinner: Cava
// bowl" → Dinner + "Cava bowl"; "pasta for lunch" → Lunch, name kept.
function slotFromName(name) {
	const lead = name?.match(LEADING_SLOT);
	if (lead) return { label: slotFor(lead[1]), name: name.slice(lead[0].length) };
	const any = name?.match(ANY_SLOT);
	return { label: any ? slotFor(any[1]) : null, name };
}

// Returns { method: "PUT" | "POST", mealId, body, replaced } for the day's meals.
export function planMealWrite(
	meals,
	{ mealLabel, mealName, calories, proteinGrams },
) {
	const fromName = normalizeLabel(mealLabel)
		? { label: normalizeLabel(mealLabel), name: mealName }
		: slotFromName(mealName);
	const label = fromName.label;
	const body = {
		mealLabel: label,
		mealName: fromName.name?.trim() || null,
		calories,
		proteinGrams,
	};
	const existing = slotFor(label)
		? ((meals ?? []).find((m) => slotFor(m.mealLabel) === label) ?? null)
		: null;
	return existing
		? { method: "PUT", mealId: existing.id, body, replaced: existing }
		: { method: "POST", mealId: null, body, replaced: null };
}
