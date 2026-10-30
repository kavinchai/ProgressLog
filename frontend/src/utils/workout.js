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
