// Which name each exercise logged through Claude is saved under.
//
// The backend's GET /workouts/exercise-matches decides what counts as the same
// lift. A single clear spelling match ("lat pull down" → "Lat Pulldowns") is
// used automatically; when the name only loosely fits ("incline press") or fits
// two lifts, Claude must ask the user before anything is logged.

const MAX_OPTIONS = 3;

/**
 * @param names      exercise names as Claude sent them
 * @param matchesByName  { [name]: { exact, same, possible } } from the backend
 * @param keepNames  names the user confirmed are new lifts (logged as given)
 * @returns {{ names: Object, renamed: {from,to}[], ask: {name, options}[] }}
 */
export function planExerciseNames(names, matchesByName, keepNames = []) {
	const kept = new Set(keepNames.map((n) => n.trim().toLowerCase()));
	const plan = { names: {}, renamed: [], ask: [] };

	for (const name of names) {
		const found = matchesByName[name] ?? {};
		const same = found.same ?? [];
		// A loose match only matters if it's one of the user's own lifts.
		const possible = (found.possible ?? []).filter((m) => m.yourSessions > 0);
		plan.names[name] = name;

		if (found.exact || kept.has(name.trim().toLowerCase())) continue;
		if (same.length === 1) {
			plan.names[name] = same[0].name;
			plan.renamed.push({ from: name, to: same[0].name });
		} else if (same.length > 1 || possible.length > 0) {
			const options = (same.length > 1 ? same : possible)
				.slice(0, MAX_OPTIONS)
				.map((m) => m.name);
			plan.ask.push({ name, options });
		}
	}
	return plan;
}
