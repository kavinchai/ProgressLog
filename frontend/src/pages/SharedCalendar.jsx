import { useEffect, useMemo, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";
import { getCurrentWeek, localDateStr, formatDateShort } from "../utils/date";
import {
	groupByExercise,
	detectType,
	formatDuration,
	calcPace,
} from "../utils/workout";
import "./TotalStats.css";
import "./SharedCalendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const USER_PALETTE = [
	{ bg: "#dbeafe", fg: "#1e40af" },
	{ bg: "#dcfce7", fg: "#166534" },
	{ bg: "#fce7f3", fg: "#9d174d" },
	{ bg: "#fef9c3", fg: "#854d0e" },
	{ bg: "#ede9fe", fg: "#5b21b6" },
	{ bg: "#fee2e2", fg: "#991b1b" },
	{ bg: "#ccfbf1", fg: "#0f766e" },
	{ bg: "#ffedd5", fg: "#9a3412" },
];

function userColor(username) {
	let h = 0;
	for (let i = 0; i < username.length; i++)
		h = (h * 31 + username.charCodeAt(i)) >>> 0;
	return USER_PALETTE[h % USER_PALETTE.length];
}

function groupEntriesByDate(entries) {
	const map = new Map();
	for (const e of entries ?? []) {
		if (!map.has(e.sessionDate)) map.set(e.sessionDate, []);
		map.get(e.sessionDate).push(e);
	}
	return map;
}

function monthCells(year, monthIdx0) {
	const firstDow = new Date(year, monthIdx0, 1).getDay();
	const numDays = new Date(year, monthIdx0 + 1, 0).getDate();
	const cells = [];
	for (let i = 0; i < firstDow; i++) cells.push(null);
	for (let d = 1; d <= numDays; d++) {
		cells.push(localDateStr(new Date(year, monthIdx0, d)));
	}
	while (cells.length < 42) cells.push(null);
	return cells;
}

function mergeByUser(entries) {
	const order = [];
	const byUser = new Map();
	for (const e of entries) {
		if (!byUser.has(e.username)) {
			byUser.set(e.username, { sessionNames: [], sets: [] });
			order.push(e.username);
		}
		const u = byUser.get(e.username);
		if (e.sessionName) u.sessionNames.push(e.sessionName);
		for (const s of e.sets ?? []) u.sets.push(s);
	}
	return order.map((username) => {
		const { sessionNames, sets } = byUser.get(username);
		const uniqueNames = [...new Set(sessionNames)];
		const label =
			uniqueNames.length > 0
				? uniqueNames.join(" · ")
				: [...new Set(sets.map((s) => s.exerciseName))].join(" · ");
		return { username, label, sessionNames: uniqueNames, sets };
	});
}

function SetLine({ set, type }) {
	if (type === "run") {
		const dist =
			set.distanceMiles != null
				? `${Number(set.distanceMiles).toFixed(2)} mi`
				: "--";
		const dur = formatDuration(set.durationSeconds);
		const pace = calcPace(set.distanceMiles, set.durationSeconds);
		return (
			<span>
				{dist} · {dur}
				{pace ? ` (${pace})` : ""}
			</span>
		);
	}
	if (type === "timed")
		return <span>{formatDuration(set.durationSeconds)}</span>;
	const reps = set.reps ?? "--";
	return (
		<span>
			{reps} reps{set.weightLbs != null ? ` @ ${set.weightLbs} lbs` : ""}
		</span>
	);
}

function WorkoutDetails({ sets }) {
	const groups = groupByExercise(sets);
	if (groups.length === 0) {
		return <div className="muted">No exercises recorded.</div>;
	}
	return (
		<div className="sc-detail-list">
			{groups.map((g) => {
				const type = detectType(g.sets);
				return (
					<div key={`${g.name}-${g.weight}`} className="sc-detail-exercise">
						<div className="sc-detail-name">{g.name}</div>
						<ul className="sc-detail-sets">
							{g.sets.map((s, i) => (
								<li key={i}>
									<SetLine set={s} type={type} />
								</li>
							))}
						</ul>
					</div>
				);
			})}
		</div>
	);
}

function DayCell({ date, entries, isToday, onSelectEntry }) {
	const merged = mergeByUser(entries);
	return (
		<div
			data-testid={`shared-day-${date}`}
			className={
				"calendar-cell sc-day-cell" + (isToday ? " calendar-cell-today" : "")
			}
		>
			<div className="calendar-cell-date">{parseInt(date.slice(8), 10)}</div>
			<div className="sc-day-entries">
				{merged.map((m) => {
					const { bg, fg } = userColor(m.username);
					return (
						<button
							key={m.username}
							type="button"
							className="sc-day-entry"
							style={{ "--sc-user-bg": bg, "--sc-user-fg": fg }}
							onClick={() => onSelectEntry({ date, ...m })}
						>
							<span className="sc-day-user">{m.username}</span>
							{m.label && <span className="sc-day-activities">{m.label}</span>}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default function SharedCalendar() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [view, setView] = useState("week");
	const [selectedEntry, setSelectedEntry] = useState(null);

	useEffect(() => {
		let cancelled = false;
		api
			.get("/shared-calendar")
			.then((res) => {
				if (!cancelled) setData(res.data);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(
					err.response?.data?.message ?? "Could not load shared calendar.",
				);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const entriesByDate = useMemo(
		() => groupEntriesByDate(data?.entries),
		[data],
	);

	if (loading)
		return <div className="sc-loading">Loading shared calendar…</div>;
	if (error) return <div className="sc-error">{error}</div>;
	if (!data || data.totalUsers === 0) {
		return (
			<div className="sc-empty">
				No one has opted in to the community calendar yet. Turn on{" "}
				<b>Share on Community Calendar</b> in Settings to add your workouts.
			</div>
		);
	}

	const today = localDateStr(new Date());
	const week = getCurrentWeek();
	const now = new Date();
	const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
	const cells =
		view === "week" ? week : monthCells(now.getFullYear(), now.getMonth());

	return (
		<div className="sc-wrap">
			<div className="sc-stats">
				{data.totalUsers.toLocaleString()}{" "}
				{data.totalUsers === 1 ? "lifter" : "lifters"} sharing ·{" "}
				{data.entries.length}{" "}
				{data.entries.length === 1 ? "workout" : "workouts"}
			</div>

			<div className="sc-view-tabs-row">
				<nav className="page-tabs sc-view-tabs" aria-label="Calendar view">
					<button
						type="button"
						className={"page-tab" + (view === "week" ? " page-tab-active" : "")}
						onClick={() => setView("week")}
					>
						Week
					</button>
					<button
						type="button"
						className={
							"page-tab" + (view === "month" ? " page-tab-active" : "")
						}
						onClick={() => setView("month")}
					>
						Month
					</button>
				</nav>
			</div>

			<div className="sc-range-label">
				{view === "week" ? "this week" : monthLabel}
			</div>

			<div className="calendar-wrap">
				<div className="calendar-weekdays">
					{WEEKDAYS.map((d) => (
						<div key={d} className="calendar-weekday">
							{d}
						</div>
					))}
				</div>
				<div className="calendar-grid">
					{cells.map((date, i) =>
						date === null ? (
							<div
								key={`pad-${i}`}
								className="calendar-cell calendar-cell-pad"
							/>
						) : (
							<DayCell
								key={date}
								date={date}
								entries={entriesByDate.get(date) ?? []}
								isToday={date === today}
								onSelectEntry={setSelectedEntry}
							/>
						),
					)}
				</div>
			</div>

			{selectedEntry && (
				<Modal
					title={`${selectedEntry.username} — ${formatDateShort(selectedEntry.date)}`}
					onClose={() => setSelectedEntry(null)}
				>
					{selectedEntry.sessionNames.length > 0 && (
						<div className="sc-detail-session-names">
							{selectedEntry.sessionNames.join(" · ")}
						</div>
					)}
					<WorkoutDetails sets={selectedEntry.sets} />
				</Modal>
			)}
		</div>
	);
}
