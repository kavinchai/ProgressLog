import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import api from "../api";
import Avatar from "../components/Avatar";
import { PeriodNav } from "../components/ios/Ios";
import useAuthStore from "../store/authStore";
import useSwipe from "../hooks/useSwipe";
import useWeightUnit from "../hooks/useWeightUnit";
import { localDateStr } from "../utils/date";
import { groupByExercise } from "../utils/workout";
import "../components/ExerciseRow.css";
import "./SharedCalendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AVATARS_SHOWN = 3;

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

/** Everyone who shared a workout: you first (as "You"), then A to Z. */
function peopleIn(entries, me) {
	const names = [...new Set(entries.map((e) => e.username))];
	return names.sort((a, b) =>
		a === me ? -1 : b === me ? 1 : a.localeCompare(b),
	);
}

/** Each exercise on its own line: name and weight, then a pill per set. */
function WorkoutDetails({ sets }) {
	const { unit, toDisplay } = useWeightUnit();
	const groups = groupByExercise(sets);
	if (groups.length === 0) {
		return <div className="sc-detail-list muted">No exercises recorded.</div>;
	}
	return (
		<ul className="sc-detail-list">
			{groups.map((g) => (
				<li key={`${g.name}-${g.weight}`} className="sc-detail-exercise">
					<span className="sc-detail-head">
						<span className="sc-detail-name">{g.name}</span>
						{g.weight > 0 && (
							<span className="sc-detail-weight">
								{toDisplay(g.weight)} {unit}
							</span>
						)}
					</span>
					<span className="set-pills">
						{g.sets.map((s, i) => (
							<span key={i} className="set-pill" data-testid="set-pill">
								{s.reps ?? "--"}
							</span>
						))}
					</span>
				</li>
			))}
		</ul>
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
				(selected ? " sc-cell-on" : "")
			}
			aria-pressed={selected}
			aria-label={`${fmt(date, { month: "long", day: "numeric" })}: ${summary}${mine ? ", including you" : ""}`}
			onClick={() => onSelect(date)}
		>
			<span className="sc-cell-date">{parseDay(date).getDate()}</span>
			<span className="sc-stack">
				{names.slice(0, AVATARS_SHOWN).map((n) => (
					<Avatar key={n} username={n} className="sc-av-sm" />
				))}
				{count > AVATARS_SHOWN && (
					<span className="sc-more">+{count - AVATARS_SHOWN}</span>
				)}
			</span>
			{count > 0 && <span className="sc-cell-count">{count} trained</span>}
		</button>
	);
}

function DayPanel({ date, rows, me }) {
	const [open, setOpen] = useState(null);
	return (
		<div className="sc-panel">
			<div className="sc-panel-head">
				<h3>{fmt(date, { weekday: "long", month: "long", day: "numeric" })}</h3>
				<span>
					{rows.length ? `${lifters(rows.length)} trained` : "No one trained"}
				</span>
			</div>
			{rows.length > 0 && (
				<div className="sc-rows">
					{rows.map((r) => {
						const isOpen = open === r.username;
						return (
							<div
								key={r.username}
								className={
									"sc-row" +
									(r.username === me ? " sc-row-me" : "") +
									(isOpen ? " sc-row-open" : "")
								}
							>
								<button
									type="button"
									className="sc-row-button"
									aria-expanded={isOpen}
									onClick={() => setOpen(isOpen ? null : r.username)}
								>
									<Avatar username={r.username} className="sc-row-av" />
									<span className="sc-row-text">
										<span className="sc-row-name">
											{r.username}
											{r.username === me && <span className="sc-you">You</span>}
										</span>
										{r.label && <span className="sc-row-label">{r.label}</span>}
									</span>
									<ChevronDown
										size={18}
										className="sc-chev"
										aria-hidden="true"
									/>
								</button>
								{isOpen && <WorkoutDetails sets={r.sets} />}
							</div>
						);
					})}
				</div>
			)}
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

	const today = localDateStr(new Date());
	const [offset, setOffset] = useState(0);
	const [selected, setSelected] = useState(today);
	const [who, setWho] = useState(null); // null: everyone

	const me = authenticated ? username : null;
	const entriesByDate = useMemo(
		() =>
			groupEntriesByDate(
				(data?.entries ?? []).filter((e) => !who || e.username === who),
			),
		[data, who],
	);
	// Swipe the days to change month, as in History.
	const swipe = useSwipe({
		onLeft: () => offset < 0 && setOffset((o) => o + 1),
		onRight: () => setOffset((o) => o - 1),
		canLeft: offset < 0,
	});

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

	const { cells, label } = monthCells(offset);
	const rowsFor = (date) => mergeByUser(entriesByDate.get(date) ?? []);
	const trainedDays = cells.filter((d) => d && entriesByDate.has(d)).length;
	const people = peopleIn(data.entries ?? [], me);
	const goToday = () => {
		setOffset(0);
		setSelected(today);
	};

	return (
		<div className="sc-wrap">
			<PeriodNav
				title={label}
				sub={`${trainedDays} ${trainedDays === 1 ? "day" : "days"} with workouts`}
				prevLabel="Previous month"
				nextLabel="Next month"
				onPrev={() => setOffset((o) => o - 1)}
				onNext={() => setOffset((o) => o + 1)}
				nextDisabled={offset >= 0}
				action={
					(offset !== 0 || selected !== today) && (
						<button type="button" className="ios-link" onClick={goToday}>
							Today
						</button>
					)
				}
			/>

			<div className="sc-people" role="group" aria-label="Whose workouts">
				<button
					type="button"
					className={"sc-chip" + (who ? "" : " on")}
					aria-pressed={!who}
					onClick={() => setWho(null)}
				>
					Everyone
				</button>
				{people.map((name) => (
					<button
						key={name}
						type="button"
						className={"sc-chip sc-chip-person" + (who === name ? " on" : "")}
						aria-pressed={who === name}
						onClick={() => setWho(name)}
					>
						<Avatar username={name} className="sc-chip-av" />
						{name === me ? "You" : name}
					</button>
				))}
			</div>

			<div className="sc-layout">
				<div className="sc-grid" role="group" aria-label="Days">
					<div className="sc-weekdays" aria-hidden="true">
						{WEEKDAYS.map((d) => (
							<span key={d} className="sc-weekday">
								{d}
							</span>
						))}
					</div>
					<div className="sc-days ios-swipe" {...swipe}>
						{cells.map((date, i) =>
							date === null ? (
								<span key={`pad-${i}`} className="sc-cell sc-cell-pad" />
							) : (
								<DayCell
									key={date}
									date={date}
									names={rowsFor(date).map((r) => r.username)}
									isToday={date === today}
									selected={date === selected}
									mine={!!me && rowsFor(date).some((r) => r.username === me)}
									onSelect={setSelected}
								/>
							),
						)}
					</div>
				</div>
				<section className="sc-side" aria-label="Day details">
					<DayPanel
						key={selected}
						date={selected}
						rows={rowsFor(selected)}
						me={me}
					/>
				</section>
			</div>
		</div>
	);
}
