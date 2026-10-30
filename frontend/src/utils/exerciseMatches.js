// Existing lift names a typed exercise name may refer to ("lat pull down" →
// "Lat Pulldowns"), from GET /workouts/exercise-matches. The backend decides
// what counts as the same lift; this caches answers per name and remembers
// names the user chose to keep as typed.
import api from "../api";

const EMPTY = { exact: null, same: [], possible: [] };
const KEPT_KEY = "exerciseNames.kept";
const cache = new Map();

export function fetchMatches(name) {
	const key = name?.trim();
	if (!key) return Promise.resolve(EMPTY);
	if (!cache.has(key)) {
		cache.set(
			key,
			api
				.get("/workouts/exercise-matches", { params: { name: key } })
				.then(({ data }) => ({
					exact: data?.exact ?? null,
					same: Array.isArray(data?.same) ? data.same : [],
					possible: Array.isArray(data?.possible) ? data.possible : [],
				}))
				.catch(() => {
					cache.delete(key);
					return EMPTY;
				}),
		);
	}
	return cache.get(key);
}

export function clearMatchCache() {
	cache.clear();
}

function loadKept() {
	try {
		const saved = JSON.parse(localStorage.getItem(KEPT_KEY));
		return new Set(Array.isArray(saved) ? saved : []);
	} catch {
		return new Set();
	}
}

/** True if the user chose to keep this exact name instead of a suggestion. */
export function isKept(name) {
	return loadKept().has(name.trim().toLowerCase());
}

export function keepName(name) {
	const kept = loadKept();
	kept.add(name.trim().toLowerCase());
	try {
		localStorage.setItem(KEPT_KEY, JSON.stringify([...kept]));
	} catch {
		// Storage unavailable (private mode) — the choice lasts this visit only.
	}
}

/** The existing lift to suggest for a typed name, or null (none for a name already in use). */
export function suggestionFor(name, matches) {
	const top = matches?.same?.[0];
	if (!top || matches.exact || !name?.trim() || top.name === name.trim())
		return null;
	return isKept(name) ? null : top;
}

/** "you · 31 sessions", or "2 lifters" for a name only others use. */
export function usageLabel(match) {
	if (match.yourSessions > 0)
		return `you · ${match.yourSessions} session${match.yourSessions === 1 ? "" : "s"}`;
	return `${match.lifters} lifter${match.lifters === 1 ? "" : "s"}`;
}
