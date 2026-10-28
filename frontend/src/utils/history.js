import { localDateStr, avg } from "./date";

// Pure helpers for the History pages (Weekly / Total).

const toNumber = (s) => (s == null ? null : Number(s));

// Every 'YYYY-MM-DD' from start to end inclusive, ascending.
export function datesBetween(start, end) {
	const dates = [];
	for (
		let d = new Date(`${start}T00:00:00`);
		d <= new Date(`${end}T00:00:00`);
		d.setDate(d.getDate() + 1)
	) {
		dates.push(localDateStr(d));
	}
	return dates;
}

// Averages of the logged values in a set of day rows (from buildDayRows).
export function summarize(rows) {
	return {
		weight: toNumber(avg(rows.map((r) => r.weight))),
		calories: toNumber(avg(rows.map((r) => r.calories))),
		protein: toNumber(avg(rows.map((r) => r.protein))),
		steps: toNumber(avg(rows.map((r) => r.steps))),
		workouts: rows.filter((r) => r.workout).length,
	};
}

// Groups day rows into Sunday-start weeks and averages `field` per week.
// Weeks with nothing logged keep value null so gaps stay visible in charts.
export function weeklyAverages(rows, field) {
	const weeks = new Map();
	for (const row of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
		const d = new Date(`${row.date}T00:00:00`);
		d.setDate(d.getDate() - d.getDay());
		const weekStart = localDateStr(d);
		if (!weeks.has(weekStart)) weeks.set(weekStart, []);
		weeks.get(weekStart).push(row[field]);
	}
	return [...weeks].map(([weekStart, values]) => ({
		weekStart,
		value: toNumber(avg(values)),
	}));
}

// Number of workout sessions logged on each date.
export function workoutCountsByDate(workoutData) {
	const counts = new Map();
	for (const s of workoutData ?? []) {
		counts.set(s.sessionDate, (counts.get(s.sessionDate) ?? 0) + 1);
	}
	return counts;
}

// Opacity for a calendar heat cell: faint at 0, strongest at/above the goal.
export function shadeAlpha(value, goal) {
	if (value == null || !goal) return null;
	return 0.12 + Math.min(1, Math.max(0, value / goal)) * 0.78;
}
