import { toDisplay, fromDisplay } from "../hooks/useWeightUnit";

const EXERCISE_NAME_ALIASES = {
	"lat raises": "Lateral Raises",
	"lat raise": "Lateral Raises",
};

/** Map common misnamed exercises to their canonical form. Returns input unchanged otherwise. */
export function canonicalExerciseName(name) {
	if (!name) return name;
	return EXERCISE_NAME_ALIASES[name.toLowerCase().trim()] ?? name;
}

export function groupByExercise(exerciseSets) {
	const map = {};
	for (const s of exerciseSets ?? []) {
		const name = canonicalExerciseName(s.exerciseName);
		const key = `${name}__${s.weightLbs}`;
		if (!map[key])
			map[key] = { name, weight: parseFloat(s.weightLbs), sets: [] };
		map[key].sets.push(s);
	}
	return Object.values(map)
		.sort((a, b) => a.name.localeCompare(b.name) || b.weight - a.weight)
		.map((g) => ({
			...g,
			sets: g.sets.sort((a, b) => a.setNumber - b.setNumber),
		}));
}

// ── Workout form state ⇄ API payload ─────────────────────────────────────────

export function emptySet(num) {
	return { setNumber: num, reps: "", weightLbs: "" };
}

export function emptyExercise() {
	return { exerciseName: "", sets: [emptySet(1)] };
}

export function exercisesToForm(exercises, unit = "lbs") {
	return (exercises ?? []).map((ex) => ({
		exerciseName: ex.exerciseName,
		sets: (ex.sets ?? []).map((s) => ({
			setNumber: s.setNumber,
			reps: String(s.reps),
			weightLbs: String(toDisplay(s.weightLbs, unit) ?? ""),
		})),
	}));
}

export function exercisesToPayload(exercises, unit = "lbs") {
	return exercises
		.filter((ex) => ex.exerciseName.trim())
		.map((ex) => ({
			exerciseName: ex.exerciseName.trim(),
			sets: ex.sets.map((s) => ({
				setNumber: s.setNumber,
				reps: parseInt(s.reps) || 0,
				weightLbs: fromDisplay(s.weightLbs, unit) || 0,
			})),
		}));
}
