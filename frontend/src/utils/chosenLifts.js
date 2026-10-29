// Saved "Choose lifts" selections and lift ordering, shared by Strength and Community.

export function loadChosen(storageKey) {
	try {
		const saved = JSON.parse(localStorage.getItem(storageKey));
		return Array.isArray(saved) ? saved : null;
	} catch {
		return null;
	}
}

export function saveChosen(storageKey, names) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(names));
	} catch {
		// Storage unavailable (private mode) — the choice lasts this visit only.
	}
}

export function sortLifts(lifts, sortKey) {
	const list = [...lifts];
	if (sortKey === "az")
		return list.sort((a, b) => a.name.localeCompare(b.name));
	if (sortKey === "change")
		return list.sort(
			(a, b) =>
				(b.change ?? -Infinity) - (a.change ?? -Infinity) ||
				a.name.localeCompare(b.name),
		);
	return list.sort(
		(a, b) =>
			b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name),
	);
}
