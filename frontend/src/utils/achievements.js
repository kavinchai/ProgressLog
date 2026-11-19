// Achievements, worked out from data the app already has: workouts, meals and
// steps. Nothing is stored on the server; "earned on" is the day the data
// first met the rule.
import MILESTONES from "../config/volumeMilestones.json";
import { localDateStr } from "./date";

const STEPS_DAY = 10000;

const PLATE_TIERS = {
	bench: [135, 225, 315],
	squat: [135, 225, 315, 405],
	deadlift: [135, 225, 315, 405, 495],
};
const LIFT_TITLES = {
	bench: "Bench press",
	squat: "Squat",
	deadlift: "Deadlift",
};

const WORKOUT_COUNTS = [1, 10, 50, 100, 250];
const STREAK_WEEKS = [2, 4, 8, 12];
const PROTEIN_DAYS = [7, 30, 100];
const STEP_DAYS = [7, 30];
const LIFETIME_STEPS = 1000000;

/** The barbell lift a set belongs to, or null for anything else. */
export function liftFor(name) {
	const n = (name ?? "")
		.toLowerCase()
		.replace(/[^a-z ]/g, "")
		.trim();
	if (/^(barbell |flat )?bench( press)?$/.test(n)) return "bench";
	if (/^(barbell |back )?squats?$/.test(n)) return "squat";
	if (/^(barbell |conventional )?deadlifts?$/.test(n)) return "deadlift";
	return null;
}

/** Weight × reps over every set of a workout, in lbs. */
export function workoutVolume(session) {
	return (session?.exerciseSets ?? []).reduce((sum, s) => {
		const w = Number(s.weightLbs);
		const r = Number(s.reps);
		return w > 0 && r > 0 ? sum + w * r : sum;
	}, 0);
}

/** The heaviest milestone a weight reaches ("about the weight of an elephant"). */
export function equivalentFor(lbs) {
	let match = null;
	for (const m of MILESTONES) if (lbs >= m.lbs) match = m;
	return match;
}

/** "Nov 6" for an ISO date. */
export function monthDay(iso) {
	return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/** Ids earned now that weren't before, in the order they appear. */
export function newlyEarned(before, now) {
	const seen = new Set(before);
	return now.filter((id) => !seen.has(id));
}

// The Sunday that starts the week of an ISO date.
function weekOf(iso) {
	const d = new Date(`${iso}T12:00:00`);
	d.setDate(d.getDate() - d.getDay());
	return localDateStr(d);
}

function addDays(iso, days) {
	const d = new Date(`${iso}T12:00:00`);
	d.setDate(d.getDate() + days);
	return localDateStr(d);
}

// A badge for "reach `target`", given the dates each unit was reached.
function countBadge({ id, name, detail, icon, unit, target, dates }) {
	const earnedOn = dates.length >= target ? dates[target - 1] : null;
	return {
		id,
		name,
		detail,
		icon,
		unit,
		target,
		current: Math.min(dates.length, target),
		progress: Math.min(dates.length / target, 1),
		earnedOn,
	};
}

function plateBadges(sessions) {
	const best = { bench: 0, squat: 0, deadlift: 0 };
	const earned = {};
	for (const s of sessions) {
		for (const set of s.exerciseSets ?? []) {
			const lift = liftFor(set.exerciseName);
			const w = Number(set.weightLbs);
			if (!lift || !(Number(set.reps) >= 1) || !(w > 0)) continue;
			best[lift] = Math.max(best[lift], w);
			PLATE_TIERS[lift].forEach((tier, i) => {
				const id = `${lift}-${i + 1}`;
				if (w >= tier && !earned[id]) earned[id] = s.sessionDate;
			});
		}
	}
	return Object.entries(PLATE_TIERS).flatMap(([lift, tiers]) =>
		tiers.map((tier, i) => {
			const id = `${lift}-${i + 1}`;
			return {
				id,
				lift,
				tier: i + 1,
				name: `${i + 1}-plate ${lift}`,
				detail: `${LIFT_TITLES[lift]} ${tier} lbs for at least one rep — ${i + 1} plate${i ? "s" : ""} a side.`,
				icon: "barbell",
				unit: "lbs",
				target: tier,
				current: best[lift],
				progress: Math.min(best[lift] / tier, 1),
				earnedOn: earned[id] ?? null,
			};
		}),
	);
}

// Each lift's highest club earned and the next one (or just the first).
function shownPlates(badges) {
	return Object.keys(PLATE_TIERS).flatMap((lift) => {
		const tiers = badges.filter((b) => b.lift === lift);
		const lastEarned = tiers.filter((b) => b.earnedOn).pop();
		const next = tiers.find((b) => !b.earnedOn);
		return [lastEarned, next].filter(Boolean);
	});
}

function streakBadges(workoutDays, today) {
	const weeks = [...new Set(workoutDays.map(weekOf))].sort();
	const firstDay = new Map();
	for (const d of workoutDays) {
		const w = weekOf(d);
		if (!firstDay.has(w)) firstDay.set(w, d);
	}
	// Day each streak length was first reached.
	const reached = [];
	let run = 0;
	weeks.forEach((w, i) => {
		run = i > 0 && addDays(weeks[i - 1], 7) === w ? run + 1 : 1;
		if (!reached[run - 1]) reached[run - 1] = firstDay.get(w);
	});
	// The streak still going: it ends this week or last week.
	const lastWeek = weeks[weeks.length - 1];
	const thisWeek = weekOf(today);
	const ongoing =
		lastWeek === thisWeek || addDays(lastWeek ?? "1970-01-04", 7) === thisWeek
			? run
			: 0;
	return STREAK_WEEKS.map((n) => {
		const earnedOn = reached[n - 1] ?? null;
		return {
			id: `streak-${n}`,
			name: `${n}-week streak`,
			detail: `Work out at least once a week for ${n} weeks in a row.`,
			icon: "flame",
			unit: "weeks",
			target: n,
			current: earnedOn ? n : Math.min(ongoing, n),
			progress: earnedOn ? 1 : Math.min(ongoing / n, 1),
			earnedOn,
		};
	});
}

function volumeSummary(sessions, today) {
	let total = 0;
	const earned = {};
	let biggest = null;
	const month = today.slice(0, 7);
	const monthDays = new Set();
	let monthVolume = 0;
	for (const s of sessions) {
		const v = workoutVolume(s);
		total += v;
		for (const m of MILESTONES) {
			if (total >= m.lbs && !earned[m.id]) earned[m.id] = s.sessionDate;
		}
		if (v > 0 && (!biggest || v > biggest.volume)) {
			biggest = { volume: v, date: s.sessionDate, name: s.sessionName ?? null };
		}
		if (s.sessionDate.startsWith(month)) {
			monthVolume += v;
			if ((s.exerciseSets ?? []).length) monthDays.add(s.sessionDate);
		}
	}
	const milestones = MILESTONES.map((m) => ({
		...m,
		earnedOn: earned[m.id] ?? null,
		progress: Math.min(total / m.lbs, 1),
	}));
	return {
		total,
		milestones,
		next: milestones.find((m) => !m.earnedOn) ?? null,
		biggest,
		thisMonth: { volume: monthVolume, workouts: monthDays.size },
	};
}

/**
 * Everything the Achievements screens show. Weights are in lbs; the screens
 * convert them for people who use kg.
 */
export function computeAchievements({
	workouts = [],
	nutrition = [],
	steps = [],
	proteinGoal,
	today = localDateStr(new Date()),
}) {
	const sessions = [...workouts].sort((a, b) =>
		a.sessionDate.localeCompare(b.sessionDate),
	);
	const workoutDays = [
		...new Set(
			sessions
				.filter((s) => (s.exerciseSets ?? []).length > 0)
				.map((s) => s.sessionDate),
		),
	];

	const plates = plateBadges(sessions);
	const workoutBadges = WORKOUT_COUNTS.map((n) =>
		countBadge({
			id: `workouts-${n}`,
			name: n === 1 ? "First workout" : `${n} workouts`,
			detail:
				n === 1
					? "Log your first workout."
					: `Log ${n} workouts. Any day with at least one exercise counts.`,
			icon: n === 1 ? "star" : "calendar",
			unit: "workouts",
			target: n,
			dates: workoutDays,
		}),
	);
	const streaks = streakBadges(workoutDays, today);

	const proteinDays = [...nutrition]
		.filter(
			(n) =>
				(n.meals?.length ?? 0) > 0 &&
				proteinGoal > 0 &&
				Number(n.totalProtein) >= proteinGoal,
		)
		.map((n) => n.logDate)
		.sort();
	const stepEntries = [...steps].sort((a, b) =>
		a.logDate.localeCompare(b.logDate),
	);
	const stepDays = stepEntries
		.filter((s) => s.steps >= STEPS_DAY)
		.map((s) => s.logDate);
	let lifetimeSteps = 0;
	let millionOn = null;
	for (const s of stepEntries) {
		lifetimeSteps += s.steps;
		if (!millionOn && lifetimeSteps >= LIFETIME_STEPS) millionOn = s.logDate;
	}

	const health = [
		...PROTEIN_DAYS.map((n) =>
			countBadge({
				id: `protein-${n}`,
				name: `Protein ${n === 7 ? "week" : n === 30 ? "month" : n}`,
				detail: `Hit your protein goal on ${n} days.`,
				icon: "protein",
				unit: "days",
				target: n,
				dates: proteinDays,
			}),
		),
		...STEP_DAYS.map((n) =>
			countBadge({
				id: `steps-${n}`,
				name: `10k ${n === 7 ? "week" : "month"}`,
				detail: `Walk 10,000 steps on ${n} days.`,
				icon: "steps",
				unit: "days",
				target: n,
				dates: stepDays,
			}),
		),
		{
			id: "steps-1m",
			name: "1 million steps",
			detail: "Walk a million steps in total.",
			icon: "steps",
			unit: "steps",
			target: LIFETIME_STEPS,
			current: Math.min(lifetimeSteps, LIFETIME_STEPS),
			progress: Math.min(lifetimeSteps / LIFETIME_STEPS, 1),
			earnedOn: millionOn,
		},
	];

	const volume = volumeSummary(sessions, today);
	const allBadges = [...plates, ...workoutBadges, ...streaks, ...health];
	const earnedIds = [
		...volume.milestones.filter((m) => m.earnedOn).map((m) => `volume-${m.id}`),
		...allBadges.filter((b) => b.earnedOn).map((b) => b.id),
	];

	const group = (id, title, badges, all = badges) => ({
		id,
		title,
		badges,
		earned: all.filter((b) => b.earnedOn).length,
		total: all.length,
	});

	return {
		volume,
		allBadges,
		groups: [
			group("plates", "Plate clubs", shownPlates(plates), plates),
			group("workouts", "Workouts", workoutBadges),
			group("streaks", "Streaks", streaks),
			group("health", "Nutrition and steps", health),
		],
		earnedIds,
		earnedCount: earnedIds.length,
		totalCount: allBadges.length + volume.milestones.length,
	};
}
