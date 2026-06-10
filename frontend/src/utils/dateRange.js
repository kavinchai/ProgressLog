import { localDateStr } from "./date";

// Time-range options shared by the Strength and Cardio progress pages.
export const RANGE_OPTIONS = [
	{ key: "4W", label: "4W", days: 28 },
	{ key: "3M", label: "3M", days: 90 },
	{ key: "6M", label: "6M", days: 180 },
	{ key: "ALL", label: "All", days: null },
];

function todayMinusDays(days) {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - days);
	return localDateStr(d);
}

// Number of days for a range key; defaults to the last option ("All" / no cutoff).
export function rangeDaysFor(key) {
	return (
		RANGE_OPTIONS.find((r) => r.key === key) ??
		RANGE_OPTIONS[RANGE_OPTIONS.length - 1]
	).days;
}

// Keep sessions on/after the cutoff implied by `days` (null = no filtering).
export function filterByRange(sessions, days) {
	if (days == null) return sessions;
	const cutoff = todayMinusDays(days);
	return sessions.filter((s) => s.sessionDate >= cutoff);
}
