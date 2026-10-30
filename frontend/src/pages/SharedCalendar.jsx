import { useEffect, useMemo, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";
import useAuthStore from "../store/authStore";
import useMediaQuery, { MOBILE_QUERY } from "../hooks/useMediaQuery";
import { getWeek, localDateStr } from "../utils/date";
import { groupByExercise } from "../utils/workout";
import "./SharedCalendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AVATARS_SHOWN = 3;

// Avatar colours, picked per username so a lifter keeps theirs everywhere.
const USER_COLORS = [
	"#1e40af",
	"#166534",
	"#9d174d",
	"#854d0e",
	"#5b21b6",
	"#991b1b",
	"#0f766e",
	"#9a3412",
];

function userColor(username) {
	let h = 0;
	for (let i = 0; i < username.length; i++)
		h = (h * 31 + username.charCodeAt(i)) >>> 0;
	return USER_COLORS[h % USER_COLORS.length];
}

const parseDay = (iso) => {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
};
const fmt = (iso, opts) => parseDay(iso).toLocaleDateString("en-US", opts);

function groupEntriesByDate(entries) {
	const map = new Map();
	for (const e of entries ?? []) {
		if (!map.has(e.sessionDate)) map.set(e.sessionDate, []);
		map.get(e.sessionDate).push(e);
	}
	return map;
}

/** Days of the month at `offset` months from now, padded to whole weeks with nulls. */
function monthCells(offset) {
	const now = new Date();
	const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
	const numDays = new Date(
		first.getFullYear(),
		first.getMonth() + 1,
		0,
	).getDate();
	const cells = Array(first.getDay()).fill(null);
	for (let d = 1; d <= numDays; d++)
		cells.push(
			localDateStr(new Date(first.getFullYear(), first.getMonth(), d)),
		);
	while (cells.length % 7) cells.push(null);
	return {
		cells,
		label: `${fmt(localDateStr(first), { month: "long" })} ${first.getFullYear()}`,
	};
}

function weekCells(offset) {
	const days = getWeek(offset);
	const end = parseDay(days[6]);
	const sameMonth = parseDay(days[0]).getMonth() === end.getMonth();
	const label = `${fmt(days[0], { month: "short", day: "numeric" })} – ${fmt(
		days[6],
		sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" },
	)}`;
	return { cells: days, label };
}

/** One row per lifter for a day: several sessions are merged into one. */
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
		return { username, label, sets };
	});
}

function SetLine({ set }) {
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
				return (
					<div key={`${g.name}-${g.weight}`} className="sc-detail-exercise">
						<div className="sc-detail-name">{g.name}</div>
						<ul className="sc-detail-sets">
							{g.sets.map((s, i) => (
								<li key={i}>
									<SetLine set={s} />
								</li>
							))}
						</ul>
					</div>
				);
			})}
		</div>
	);
}

function Avatar({ username, small }) {
	return (
		<span
			className={`sc-av${small ? " sc-av-sm" : ""}`}
			style={{ background: userColor(username) }}
			aria-hidden="true"
		>
			{username[0].toUpperCase()}
		</span>
	);
}

const lifters = (n) => `${n} ${n === 1 ? "lifter" : "lifters"}`;

function DayCell({ date, names, isToday, selected, mine, onSelect }) {
	const count = names.length;
	const summary = count ? `${lifters(count)} trained` : "no workouts";
	return (
		<button
			type="button"
			data-testid={`shared-day-${date}`}
			className={
				"sc-cell" +
				(isToday ? " sc-cell-today" : "") +
				(selected ? " sc-cell-on" : "") +
				(mine ? " sc-cell-mine" : "")
			}
			aria-pressed={selected}
			aria-label={`${fmt(date, { month: "long", day: "numeric" })}: ${summary}${mine ? ", including you" : ""}`}
			onClick={() => onSelect(date)}
		>
			<span className="sc-cell-date">{parseDay(date).getDate()}</span>
			{count > 0 && (
				<>
					<span className="sc-stack">
						{names.slice(0, AVATARS_SHOWN).map((n) => (
							<Avatar key={n} username={n} small />
						))}
						{count > AVATARS_SHOWN && (
							<span className="sc-more">+{count - AVATARS_SHOWN}</span>
						)}
					</span>
					<span className="sc-cell-count">{count} trained</span>
				</>
			)}
		</button>
	);
}

function DayPanel({ date, rows, me, showDate }) {
	const [open, setOpen] = useState(null);
	return (
		<div className="sc-panel">
			<div className="sc-panel-head">
				{showDate && (
					<h3>
						{fmt(date, { weekday: "long", month: "long", day: "numeric" })}
					</h3>
				)}
				<span className="muted">
					{rows.length ? `${lifters(rows.length)} trained` : "No one trained"}
				</span>
			</div>
			{rows.map((r) => {
				const isOpen = open === r.username;
				return (
					<div
						key={r.username}
						className={"sc-row" + (r.username === me ? " sc-row-me" : "")}
					>
						<button
							type="button"
							className="sc-row-button"
							aria-expanded={isOpen}
							onClick={() => setOpen(isOpen ? null : r.username)}
						>
							<Avatar username={r.username} />
							<span className="sc-row-text">
								<span className="sc-row-name">
									{r.username}
									{r.username === me && <span className="sc-you">You</span>}
								</span>
								{r.label && <span className="sc-row-label">{r.label}</span>}
							</span>
							<span className="sc-chev" aria-hidden="true">
								{isOpen ? "⌃" : "⌄"}
							</span>
						</button>
						{isOpen && <WorkoutDetails sets={r.sets} />}
					</div>
				);
			})}
		</div>
	);
}

function Segmented({ label, options, value, onChange }) {
	return (
		<div className="sc-seg" role="group" aria-label={label}>
			{options.map(([key, text]) => (
				<button
					key={key}
					type="button"
					className={key === value ? "on" : ""}
					aria-pressed={key === value}
					onClick={() => onChange(key)}
				>
					{text}
				</button>
			))}
		</div>
	);
}

function useSharedCalendar() {
	const [state, setState] = useState({ data: null, error: null });
	useEffect(() => {
		let cancelled = false;
		api
			.get("/shared-calendar")
			.then((res) => !cancelled && setState({ data: res.data, error: null }))
			.catch(
				(err) =>
					!cancelled &&
					setState({
						data: null,
						error:
							err.response?.data?.message ?? "Could not load shared calendar.",
					}),
			);
		return () => {
			cancelled = true;
		};
	}, []);
	return state;
}

export default function SharedCalendar() {
	const { data, error } = useSharedCalendar();
	const authenticated = useAuthStore((s) => s.authenticated);
	const username = useAuthStore((s) => s.username);
	const isPhone = useMediaQuery(MOBILE_QUERY);

	const today = localDateStr(new Date());
	const [view, setView] = useState("month");
	const [offset, setOffset] = useState(0);
	const [selected, setSelected] = useState(today);
	const [who, setWho] = useState("everyone");
	const [sheetOpen, setSheetOpen] = useState(false);

	const me = authenticated ? username : null;
	const justMe = me && who === "me";
	const entriesByDate = useMemo(
		() =>
			groupEntriesByDate(
				(data?.entries ?? []).filter((e) => !justMe || e.username === me),
			),
		[data, justMe, me],
	);

	if (error) return <div className="sc-error">{error}</div>;
	if (!data) return <div className="sc-loading">Loading shared calendar…</div>;
	if (data.totalUsers === 0) {
		return (
			<div className="sc-empty">
				No one has opted in to the community calendar yet. Turn on{" "}
				<b>Share on community calendar</b> in Settings to add your workouts.
			</div>
		);
	}

	const { cells, label } =
		view === "month" ? monthCells(offset) : weekCells(offset);
	const rowsFor = (date) => mergeByUser(entriesByDate.get(date) ?? []);
	const changeView = (next) => {
		setView(next);
		setOffset(0);
	};
	const goToday = () => {
		setOffset(0);
		setSelected(today);
	};
	const select = (date) => {
		setSelected(date);
		if (isPhone) setSheetOpen(true);
	};
	const unit = view === "month" ? "month" : "week";
	const panel = (
		<DayPanel
			key={selected}
			date={selected}
			rows={rowsFor(selected)}
			me={me}
			showDate={!isPhone}
		/>
	);

	return (
		<div className="sc-wrap">
			<div className="sc-toolbar">
				<div className="sc-nav">
					<button
						type="button"
						aria-label={`Previous ${unit}`}
						onClick={() => setOffset((o) => o - 1)}
					>
						‹
					</button>
					<span className="sc-range">{label}</span>
					<button
						type="button"
						aria-label={`Next ${unit}`}
						onClick={() => setOffset((o) => o + 1)}
					>
						›
					</button>
				</div>
				<button type="button" className="btn btn-sm" onClick={goToday}>
					Today
				</button>
				<span className="sc-spacer" />
				{me && (
					<Segmented
						label="Whose workouts"
						options={[
							["everyone", "Everyone"],
							["me", "Just me"],
						]}
						value={who}
						onChange={setWho}
					/>
				)}
				<Segmented
					label="Calendar range"
					options={[
						["week", "Week"],
						["month", "Month"],
					]}
					value={view}
					onChange={changeView}
				/>
			</div>

			<div className="sc-layout">
				<div className="sc-grid" role="group" aria-label="Days">
					{WEEKDAYS.map((d) => (
						<div key={d} className="sc-weekday" aria-hidden="true">
							{d}
						</div>
					))}
					{cells.map((date, i) =>
						date === null ? (
							<div key={`pad-${i}`} className="sc-cell sc-cell-pad" />
						) : (
							<DayCell
								key={date}
								date={date}
								names={rowsFor(date).map((r) => r.username)}
								isToday={date === today}
								selected={date === selected}
								mine={!!me && rowsFor(date).some((r) => r.username === me)}
								onSelect={select}
							/>
						),
					)}
				</div>
				{!isPhone && (
					<section className="sc-side" aria-label="Day details">
						{panel}
					</section>
				)}
			</div>
			{me && !justMe && (
				<p className="sc-legend muted">
					<span className="sc-legend-dot" /> days you trained
				</p>
			)}

			{isPhone && sheetOpen && (
				<Modal
					title={fmt(selected, {
						weekday: "short",
						month: "short",
						day: "numeric",
					})}
					onClose={() => setSheetOpen(false)}
				>
					{panel}
				</Modal>
			)}
		</div>
	);
}
