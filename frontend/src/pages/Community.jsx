import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import useAuthStore from "../store/authStore";
import useWeightUnit from "../hooks/useWeightUnit";
import api from "../api";
import featuredConfig from "../config/featuredExercises.json";
import SharedCalendar from "./SharedCalendar";
import {
	PageHeader,
	PullDownMenu,
	SegmentedControl,
} from "../components/ios/Ios";
import Avatar from "../components/Avatar";
import ChooseLiftsModal from "../components/ChooseLiftsModal";
import { loadChosen, saveChosen } from "../utils/chosenLifts";
import "./Community.css";

const FEATURED_NAMES = featuredConfig.strength ?? [];
const FEATURED = FEATURED_NAMES.map((n) => n.toLowerCase());
const CHOSEN_KEY = "community.chosenLifts";
const PREVIEW_ROWS = 5;
const NEW_BESTS = 5;

function formatDate(iso) {
	if (!iso) return "—";
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

const featuredIndex = (name) => {
	const i = FEATURED.indexOf(name.toLowerCase());
	return i === -1 ? FEATURED.length : i;
};

const isChosen = (chosen, name) => chosen.has(name.toLowerCase());

/** Chosen lifts that have a board this period, featured ones first. */
function liftChoices(boards, chosen) {
	return boards
		.filter((b) => isChosen(chosen, b.exerciseName))
		.sort(
			(a, b) => featuredIndex(a.exerciseName) - featuredIndex(b.exerciseName),
		)
		.map((b) => b.exerciseName);
}

/** Most recent date a top-ten best on this board was set. */
const latestDate = (board) =>
	board.entries.reduce(
		(max, e) => (e.achievedDate > max ? e.achievedDate : max),
		"",
	);

/** "You #3" when the viewer is ranked on this lift. */
function rankLabel(standings, name) {
	const mine = standings.find((s) => s.exerciseName === name);
	return mine ? `You #${mine.rank}` : "";
}

/** Why the board is empty when there are boards but none to show. */
function noChoiceMessage(signedIn, chosen) {
	if (!signedIn) return "No featured lifts have been logged this period yet.";
	if (chosen.size === 0)
		return "No lifts chosen. Tap Edit lifts to pick the exercises to compare.";
	return "None of your chosen lifts have been logged this period. Try All time or Edit lifts.";
}

// ── Small controls ──────────────────────────────────────────────────────────

const VIEW_OPTIONS = [
	{ value: "leaderboard", label: "Leaderboard" },
	{ value: "calendar", label: "Calendar" },
];
const PERIOD_OPTIONS = [
	{ value: "month", label: "This month" },
	{ value: "all", label: "All time" },
];

function Rank({ n }) {
	return <span className={`lb-rank${n <= 3 ? ` lb-rank-${n}` : ""}`}>{n}</span>;
}

function Move({ change }) {
	if (change == null || change === 0) return <span className="lb-move">—</span>;
	const up = change > 0;
	return (
		<span
			className={`lb-move ${up ? "up" : "down"}`}
			aria-label={`${up ? "Up" : "Down"} ${Math.abs(change)}`}
		>
			{up ? "▲" : "▼"} {Math.abs(change)}
		</span>
	);
}

// ── Board ───────────────────────────────────────────────────────────────────

const PERIOD_LABELS = { month: "This month", all: "All time" };
const FOOTNOTE =
	"Heaviest set wins, then reps. Arrows show the change since last week.";

function YouTag() {
	return <span className="lb-you">You</span>;
}

/** Lift chips; the sliders button opens Choose lifts. */
function LiftChips({ choices, value, onChange, onChoose }) {
	const ref = useRef(null);

	// Keep the picked chip in view, e.g. after tapping a standing card.
	useEffect(() => {
		const row = ref.current;
		const chip = row?.querySelector('[aria-pressed="true"]');
		if (!chip || !row.scrollTo) return;
		const left = chip.offsetLeft - 16;
		const right = chip.offsetLeft + chip.offsetWidth + 16 - row.clientWidth;
		if (row.scrollLeft > left) row.scrollTo({ left, behavior: "smooth" });
		else if (row.scrollLeft < right)
			row.scrollTo({ left: right, behavior: "smooth" });
	}, [value]);

	if (!choices.length && !onChoose) return null;
	return (
		<div className="lb-chips" role="group" aria-label="Lift" ref={ref}>
			{onChoose && (
				<button
					type="button"
					className="lb-chip lb-chip-edit"
					aria-label="Edit lifts"
					onClick={onChoose}
				>
					<SlidersHorizontal size={18} aria-hidden="true" />
				</button>
			)}
			{choices.map((name) => (
				<button
					key={name}
					type="button"
					className={"lb-chip" + (name === value ? " on" : "")}
					aria-pressed={name === value}
					onClick={() => onChange(name)}
				>
					{name}
				</button>
			))}
		</div>
	);
}

/** First, second and third, with first raised in the middle. */
function Podium({ entries, me, setLabel }) {
	return (
		<ol className="lb-podium" aria-label="Top three">
			{entries.map((e) => (
				<li
					key={e.username}
					className={`lb-spot lb-spot-${e.rank}${e.username === me ? " lb-spot-me" : ""}`}
				>
					<Avatar username={e.username} className="lb-spot-av" />
					<span className="lb-spot-who">
						<span className="lb-name">{e.username}</span>
						{e.username === me && <YouTag />}
					</span>
					<span className="lb-spot-set">
						{setLabel(e.bestWeight, e.bestReps)}
					</span>
					{e.change ? <Move change={e.change} /> : null}
					<span className="lb-spot-base" aria-hidden="true">
						{e.rank}
					</span>
				</li>
			))}
		</ol>
	);
}

function BoardRow({ entry, mine, setLabel }) {
	return (
		<li className={"lb-row" + (mine ? " lb-row-me" : "")}>
			<span className="lb-row-rank">{entry.rank}</span>
			<Avatar username={entry.username} />
			<span className="lb-row-who">
				<span className="lb-row-name">
					<span className="lb-name">{entry.username}</span>
					{mine && <YouTag />}
				</span>
				<span className="lb-row-date">{formatDate(entry.achievedDate)}</span>
			</span>
			<span className="lb-row-set">
				{setLabel(entry.bestWeight, entry.bestReps)}
			</span>
			<Move change={entry.change} />
		</li>
	);
}

/** Fourth place down, plus your own row when you're below the top ten. */
function BoardList({ board, me, myStanding, setLabel }) {
	const rows = board.entries.slice(3);
	const showMine = myStanding && myStanding.rank > board.entries.length;
	if (!rows.length && !showMine) return null;
	return (
		<ol className="lb-list" aria-label={`${board.exerciseName} leaderboard`}>
			{rows.map((e) => (
				<BoardRow
					key={e.username}
					entry={e}
					mine={e.username === me}
					setLabel={setLabel}
				/>
			))}
			{showMine && (
				<>
					<li className="lb-row-gap" aria-hidden="true">
						· · ·
					</li>
					<BoardRow
						entry={{
							rank: myStanding.rank,
							username: me,
							bestWeight: myStanding.bestWeight,
							bestReps: myStanding.bestReps,
							achievedDate: myStanding.achievedDate,
							change: myStanding.change,
						}}
						mine
						setLabel={setLabel}
					/>
				</>
			)}
		</ol>
	);
}

function BoardCard({
	boards,
	choices,
	lift,
	onLift,
	period,
	onPeriod,
	me,
	standings,
	setLabel,
	onChoose,
	emptyChoice,
}) {
	const current = boards.find((b) => b.exerciseName === lift);
	const myStanding = standings.find(
		(s) => s.exerciseName === current?.exerciseName,
	);
	const count = current?.participantCount ?? 0;

	return (
		<section className="lb-board" aria-label="Leaderboard">
			<LiftChips
				choices={choices}
				value={current?.exerciseName}
				onChange={onLift}
				onChoose={onChoose}
			/>
			<div className="lb-board-head">
				<span className="lb-section-title">
					{current
						? `${count} ${count === 1 ? "lifter" : "lifters"} · best set`
						: "Best set"}
				</span>
				<PullDownMenu
					label="Period"
					buttonLabel={PERIOD_LABELS[period]}
					className="lb-period"
					sections={[
						{ options: PERIOD_OPTIONS, value: period, onChange: onPeriod },
					]}
				/>
			</div>
			{current ? (
				<div
					className="lb-board-body"
					key={`${current.exerciseName}-${period}`}
				>
					<Podium
						entries={current.entries.slice(0, 3)}
						me={me}
						setLabel={setLabel}
					/>
					<BoardList
						board={current}
						me={me}
						myStanding={myStanding}
						setLabel={setLabel}
					/>
					<p className="lb-foot">{FOOTNOTE}</p>
				</div>
			) : (
				<p className="lb-empty">
					{boards.length
						? emptyChoice
						: period === "month"
							? "No lifts logged this month yet. Try All time."
							: "No lifts logged yet."}
				</p>
			)}
		</section>
	);
}

// ── Signed-in extras ────────────────────────────────────────────────────────

function gapText(s, unit, toDisplay) {
	if (!s.ahead) return "You're #1";
	const target = `${s.ahead.username} (#${s.rank - 1})`;
	const diff = Number(s.ahead.bestWeight) - Number(s.bestWeight);
	if (diff > 0)
		return `${toDisplay(diff).toLocaleString()} ${unit} to pass ${target}`;
	const reps = s.ahead.bestReps - s.bestReps + 1;
	return `${reps} rep${reps === 1 ? "" : "s"} to pass ${target}`;
}

function progress(s) {
	if (!s.ahead) return 100;
	const ahead = Number(s.ahead.bestWeight);
	if (Number(s.bestWeight) < ahead)
		return Math.round((Number(s.bestWeight) / ahead) * 100);
	return Math.round((s.bestReps / (s.ahead.bestReps + 1)) * 100);
}

/** "▲ 1 this week" on a standing card; nothing when the rank didn't move. */
function WeekChange({ change }) {
	if (!change) return null;
	const up = change > 0;
	return (
		<span className={`lb-week ${up ? "up" : "down"}`}>
			{up ? "▲" : "▼"} {Math.abs(change)} this week
		</span>
	);
}

function Standing({ me, chosen, onPick, selected, unit, toDisplay, setLabel }) {
	const [page, setPage] = useState(0);
	if (!me.sharing) {
		return (
			<div className="lb-notice">
				Turn on sharing to see where you rank. It's under Privacy in{" "}
				<Link to="/settings">Settings</Link>.
			</div>
		);
	}
	if (!me.standings.length) {
		return (
			<div className="lb-notice">
				Log a lift this period to get on the boards.
			</div>
		);
	}
	const standings = me.standings
		.filter((s) => isChosen(chosen, s.exerciseName))
		.sort(
			(a, b) => featuredIndex(a.exerciseName) - featuredIndex(b.exerciseName),
		);
	if (!standings.length) {
		return (
			<div className="lb-notice">
				You're not ranked on any of your chosen lifts this period.
			</div>
		);
	}
	const lbs = (w) => toDisplay(Number(w)).toLocaleString();

	// Phones swipe between cards; the dots follow.
	function onScroll(e) {
		const row = e.currentTarget;
		const card = row.firstElementChild;
		if (!card) return;
		setPage(Math.round(row.scrollLeft / (card.offsetWidth + 10)));
	}

	return (
		<>
			<div className="lb-standing" onScroll={onScroll}>
				{standings.map((s) => (
					<button
						key={s.exerciseName}
						type="button"
						className={`lb-stand${s.exerciseName === selected ? " on" : ""}`}
						onClick={() => onPick(s.exerciseName)}
					>
						<span className="lb-stand-head">
							<span className="lb-stand-lift">{s.exerciseName}</span>
							<WeekChange change={s.change} />
						</span>
						<span className="lb-stand-main">
							<span className="lb-stand-rank">
								#{s.rank} <small>of {s.participantCount}</small>
							</span>
							<span className="lb-stand-best">
								<small>Best set</small>
								{setLabel(s.bestWeight, s.bestReps)}
							</span>
						</span>
						<span className="lb-stand-gap">{gapText(s, unit, toDisplay)}</span>
						<span className="lb-bar" aria-hidden="true">
							<i style={{ width: `${progress(s)}%` }} />
						</span>
						{s.ahead && (
							<span className="lb-bar-ends">
								<span>You {lbs(s.bestWeight)}</span>
								<span>
									{s.ahead.username} {lbs(s.ahead.bestWeight)}
								</span>
							</span>
						)}
					</button>
				))}
			</div>
			{standings.length > 1 && (
				<div className="lb-dots" aria-hidden="true">
					{standings.map((s, i) => (
						<i key={s.exerciseName} className={i === page ? "on" : undefined} />
					))}
				</div>
			)}
		</>
	);
}

/** The newest top-ten bests across every board, most recent first. */
function NewBests({ boards, me, period, setLabel }) {
	const items = boards
		.flatMap((b) => b.entries.map((e) => ({ ...e, lift: b.exerciseName })))
		.filter((e) => e.achievedDate)
		.sort((a, b) => b.achievedDate.localeCompare(a.achievedDate))
		.slice(0, NEW_BESTS);
	if (!items.length) return null;
	return (
		<section className="lb-section" aria-labelledby="lb-new-bests">
			<h2 id="lb-new-bests" className="lb-section-title">
				{period === "month" ? "New bests" : "Latest bests"}
			</h2>
			<ol className="lb-feed">
				{items.map((e) => (
					<li key={`${e.lift}-${e.username}`}>
						<Avatar username={e.username} className="lb-feed-av" />
						<span className="lb-feed-main">
							<span>
								<b>{e.username === me ? "You" : e.username}</b> hit{" "}
								{setLabel(e.bestWeight, e.bestReps)}
							</span>
							<span className="lb-feed-sub">
								{e.lift} · #{e.rank}
							</span>
						</span>
						<span className="lb-feed-date">{formatDate(e.achievedDate)}</span>
					</li>
				))}
			</ol>
		</section>
	);
}

function MostActive({ users, activity, me }) {
	const total = activity.reduce((n, p) => n + p.sessionCount, 0);
	const peak = Math.max(1, ...activity.map((p) => p.sessionCount));
	const busiest = activity.find((p) => p.sessionCount === peak);
	const mine = users.find((u) => u.username === me);
	const top = users[0]?.sessionCount || 1;
	return (
		<section className="lb-section" aria-labelledby="lb-most-active">
			<h2 id="lb-most-active" className="lb-section-title">
				Most active
			</h2>
			<div className={"lb-tiles" + (mine ? "" : " lb-tiles--one")}>
				<div className="lb-tile">
					<span className="lb-tile-label">Community sessions</span>
					<span className="lb-tile-value">{total}</span>
					<span className="lb-spark" aria-hidden="true">
						{activity.map((p) => (
							<i
								key={p.date}
								className={p === busiest ? "peak" : undefined}
								style={{
									height: `${Math.max(8, (p.sessionCount / peak) * 100)}%`,
								}}
							/>
						))}
					</span>
					<span className="lb-tile-sub">
						Last 30 days
						{busiest ? ` · busiest ${formatDate(busiest.date)}` : ""}
					</span>
				</div>
				{mine && (
					<div className="lb-tile">
						<span className="lb-tile-label">You</span>
						<span className="lb-tile-value">
							{mine.sessionCount}{" "}
							<small>{mine.sessionCount === 1 ? "session" : "sessions"}</small>
						</span>
						<span className="lb-tile-accent">#{mine.rank} most active</span>
					</div>
				)}
			</div>
			{users.length ? (
				<ol className="lb-active-list">
					{users.map((u) => (
						<li
							key={u.username}
							className={u.username === me ? "me" : undefined}
						>
							<Avatar username={u.username} />
							<span className="lb-active-main">
								<span className="lb-row-name">
									<span className="lb-name">{u.username}</span>
									{u.username === me && <YouTag />}
								</span>
								<span className="lb-bar lb-bar--thin" aria-hidden="true">
									<i style={{ width: `${(u.sessionCount / top) * 100}%` }} />
								</span>
							</span>
							<span className="lb-active-count">{u.sessionCount} sessions</span>
						</li>
					))}
				</ol>
			) : (
				<p className="lb-empty">No sessions yet.</p>
			)}
		</section>
	);
}

// ── Signed-out extras ───────────────────────────────────────────────────────

function Hero({ board, setLabel }) {
	return (
		<section className="lb-hero">
			<div>
				<h1 className="lb-title lb-hero-title">
					Log your lifts. <em>See where you rank.</em>
				</h1>
				<p>
					Progress Logger tracks your workouts, meals, weight and steps. Lifters
					who opt in are ranked on every lift, so you always know what to chase
					next.
				</p>
				<div className="lb-cta">
					<Link to="/login?mode=signup" className="btn btn-primary">
						Create free account
					</Link>
					<Link to="/login" className="btn">
						Sign in
					</Link>
				</div>
				<p className="lb-muted">
					Free. Your data stays private unless you turn on sharing.
				</p>
			</div>
			{board && (
				<div className="lb-card lb-preview">
					<div className="lb-card-head">
						<h2 className="lb-card-title">{board.exerciseName}</h2>
						<span className="lb-muted">Live</span>
					</div>
					<ol className="lb-active">
						{board.entries.slice(0, PREVIEW_ROWS).map((e) => (
							<li key={e.username}>
								<Rank n={e.rank} />
								<span className="lb-name">{e.username}</span>
								<span className="lb-muted">
									{setLabel(e.bestWeight, e.bestReps)}
								</span>
							</li>
						))}
					</ol>
					<div className="lb-locked">
						<span aria-hidden="true">? · you · ??? × ?</span>
						<span>Where would you rank?</span>
						<Link to="/login?mode=signup" className="btn btn-primary btn-sm">
							Find out
						</Link>
					</div>
				</div>
			)}
		</section>
	);
}

function Stats({ data, period }) {
	const when = period === "month" ? "this month" : "all time";
	const stats = [
		["Lifters sharing", data.totalUsers],
		[`Sessions ${when}`, data.totalSessions],
		[`Sets ${when}`, data.totalSets],
		[`PRs ${when}`, data.prCount],
	];
	return (
		<div className="lb-stats">
			{stats.map(([label, value]) => (
				<div key={label} className="lb-stat">
					<span className="lb-stat-value">{value.toLocaleString()}</span>
					<span className="lb-stat-label">{label}</span>
				</div>
			))}
		</div>
	);
}

const STEPS = [
	[
		"Log your workouts",
		"Sets, reps and weight, or ask Claude to log them for you.",
	],
	[
		"Turn on sharing",
		"Only your username, lift names and best sets are shown.",
	],
	["Climb the boards", "Every lift has its own board, fresh each month."],
];

function Steps() {
	return (
		<section className="lb-card">
			<h2 className="lb-card-title lb-steps-title">How it works</h2>
			<ol className="lb-steps">
				{STEPS.map(([title, text], i) => (
					<li key={title}>
						<b aria-hidden="true">{i + 1}</b>
						<div>
							<strong>{title}</strong>
							<span className="lb-muted">{text}</span>
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

function useLeaderboard(period) {
	const [state, setState] = useState({ data: null, error: null });

	useEffect(() => {
		let cancelled = false;
		api
			.get("/leaderboard", { params: { period } })
			.then((res) => !cancelled && setState({ data: res.data, error: null }))
			.catch(
				(err) =>
					!cancelled &&
					setState({
						data: null,
						error: err.response?.data?.message ?? "Could not load leaderboard.",
					}),
			);
		return () => {
			cancelled = true;
		};
	}, [period]);

	return state;
}

/** Loading / error / nobody-sharing message, or null when the boards can show. */
function statusMessage(data, error, authenticated) {
	if (error) return <p className="lb-empty">{error}</p>;
	if (!data) return <p className="lb-loading">Loading leaderboard…</p>;
	if (data.totalUsers > 0) return null;
	return (
		<p className="lb-empty">
			No one has opted in to sharing yet.{" "}
			{authenticated ? (
				<>
					Turn on <b>Share data on leaderboard</b> in{" "}
					<Link to="/settings">Settings</Link> to get on the board.
				</>
			) : (
				<>
					Sign in and turn on <b>Share data on leaderboard</b> in Settings to
					get on the board.
				</>
			)}
		</p>
	);
}

/** The page for visitors who aren't signed in: a pitch, then the boards. */
function PublicCommunity({
	viewSwitch,
	view,
	preview,
	status,
	data,
	period,
	board,
	setLabel,
}) {
	return (
		<div className="lb-page lb-public">
			<header className="lb-topbar">
				<span className="lb-brand">Progress Logger</span>
				{viewSwitch}
				<span className="lb-spacer" />
				<Link to="/login" className="btn btn-ghost">
					Sign in
				</Link>
				<Link to="/login?mode=signup" className="btn btn-primary">
					Create free account
				</Link>
			</header>
			<div className="lb-wrap">
				{view === "calendar" ? (
					<SharedCalendar />
				) : (
					<>
						<Hero board={preview} setLabel={setLabel} />
						{status ?? (
							<>
								<Stats data={data} period={period} />
								<Steps />
								{board}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}

/**
 * Lifts shown on the board. Signed-out visitors always get the featured lifts;
 * signed-in users start there and can save their own choice.
 */
function useChosenLifts(authenticated, boards) {
	const [saved, setSaved] = useState(() => loadChosen(CHOSEN_KEY));
	const chosenNames = (authenticated && saved) || FEATURED_NAMES;
	const chosen = new Set(chosenNames.map((n) => n.toLowerCase()));

	// Lifts with no board this period aren't in the dialog; keep them chosen.
	const saveChoice = (names) => {
		const onBoards = new Set(boards.map((b) => b.exerciseName.toLowerCase()));
		const next = [
			...names,
			...chosenNames.filter((n) => !onBoards.has(n.toLowerCase())),
		];
		saveChosen(CHOSEN_KEY, next);
		setSaved(next);
	};

	return { chosen, choices: liftChoices(boards, chosen), saveChoice };
}

export default function Community() {
	const authenticated = useAuthStore((s) => s.authenticated);
	const username = useAuthStore((s) => s.username);
	const { unit, toDisplay } = useWeightUnit();

	const [view, setView] = useState("leaderboard");
	const [period, setPeriod] = useState("month");
	const [lift, setLift] = useState(null);
	const [choosing, setChoosing] = useState(false);
	const { data, error } = useLeaderboard(period);

	const setLabel = (weight, reps) =>
		`${toDisplay(Number(weight)).toLocaleString()} ${unit} × ${reps}`;
	const boards = data?.exercises ?? [];
	const me = authenticated ? data?.me : null;
	const standings = me?.sharing ? me.standings : [];
	const { chosen, choices, saveChoice } = useChosenLifts(authenticated, boards);
	// A lift picked under another period may have no board now; fall back to the first.
	const selected = choices.includes(lift) ? lift : (choices[0] ?? null);

	const board = (
		<BoardCard
			boards={boards}
			choices={choices}
			onChoose={authenticated ? () => setChoosing(true) : null}
			emptyChoice={noChoiceMessage(authenticated, chosen)}
			lift={selected}
			onLift={setLift}
			period={period}
			onPeriod={setPeriod}
			me={username}
			standings={standings}
			setLabel={setLabel}
		/>
	);

	const content = statusMessage(data, error, authenticated);

	const viewSwitch = (
		<SegmentedControl
			label="View"
			options={VIEW_OPTIONS}
			value={view}
			onChange={setView}
			className="lb-view"
		/>
	);

	if (!authenticated) {
		return (
			<PublicCommunity
				viewSwitch={viewSwitch}
				view={view}
				preview={boards.find((b) => b.exerciseName === selected)}
				status={content}
				data={data}
				period={period}
				board={board}
				setLabel={setLabel}
			/>
		);
	}

	return (
		<div className="lb-page">
			<PageHeader title="Community" />
			{viewSwitch}
			{view === "calendar" ? (
				<SharedCalendar />
			) : (
				(content ?? (
					<>
						{me && (
							<section className="lb-section">
								<h2 className="lb-section-title">Your standing</h2>
								<Standing
									me={me}
									chosen={chosen}
									selected={selected}
									onPick={setLift}
									unit={unit}
									toDisplay={toDisplay}
									setLabel={setLabel}
								/>
							</section>
						)}
						<div className="lb-grid">
							{board}
							<aside className="lb-side">
								<NewBests
									boards={boards}
									me={username}
									period={period}
									setLabel={setLabel}
								/>
								<MostActive
									users={data.mostActive}
									activity={data.activity}
									me={username}
								/>
							</aside>
						</div>
					</>
				))
			)}
			{choosing && (
				<ChooseLiftsModal
					lifts={boards.map((b) => ({
						name: b.exerciseName,
						lastDate: latestDate(b),
						stale: false,
						note: `${b.participantCount} lifter${b.participantCount === 1 ? "" : "s"}`,
						detail: rankLabel(standings, b.exerciseName),
					}))}
					chosen={choices}
					defaults={liftChoices(boards, new Set(FEATURED))}
					recentLabel="All lifts"
					onSave={(names) => {
						saveChoice(names);
						setChoosing(false);
					}}
					onClose={() => setChoosing(false)}
				/>
			)}
		</div>
	);
}
