import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts";
import useAuthStore from "../store/authStore";
import useWeightUnit from "../hooks/useWeightUnit";
import api from "../api";
import featuredConfig from "../config/featuredExercises.json";
import SharedCalendar from "./SharedCalendar";
import "./Community.css";

const FEATURED = (featuredConfig.strength ?? []).map((n) => n.toLowerCase());
const PREVIEW_ROWS = 5;

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

/** Featured lifts that have a board (in featured order), else the busiest boards. */
function liftChoices(boards, selected) {
	const featured = boards
		.filter((b) => featuredIndex(b.exerciseName) < FEATURED.length)
		.sort(
			(a, b) => featuredIndex(a.exerciseName) - featuredIndex(b.exerciseName),
		)
		.map((b) => b.exerciseName);
	const names = featured.length
		? featured
		: boards.slice(0, 8).map((b) => b.exerciseName);
	if (selected && !names.includes(selected)) names.push(selected);
	return names;
}

// ── Small controls ──────────────────────────────────────────────────────────

function Segmented({ label, options, value, onChange, className = "" }) {
	return (
		<div className={`lb-seg ${className}`} role="group" aria-label={label}>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					className={o.value === value ? "on" : ""}
					aria-pressed={o.value === value}
					onClick={() => onChange(o.value)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

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

function BoardTable({ board, rows, me, myStanding, setLabel }) {
	const showMine = myStanding && myStanding.rank > rows.length;
	return (
		<table className="lb-table">
			<thead>
				<tr>
					<th scope="col">#</th>
					<th scope="col">Lifter</th>
					<th scope="col">Best set</th>
					<th scope="col" className="lb-col-date">
						Date
					</th>
					<th scope="col" className="lb-col-move">
						Week
					</th>
				</tr>
			</thead>
			<tbody>
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
						<tr className="lb-row-gap" aria-hidden="true">
							<td colSpan={5}>
								· · · {myStanding.rank - rows.length - 1 || ""}
							</td>
						</tr>
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
			</tbody>
			<caption className="lb-sr">{board.exerciseName} leaderboard</caption>
		</table>
	);
}

function BoardRow({ entry, mine, setLabel }) {
	return (
		<tr className={mine ? "lb-row-me" : undefined}>
			<td>
				<Rank n={entry.rank} />
			</td>
			<td>
				<span className="lb-who">
					<span className="lb-name">{entry.username}</span>
					{mine && <span className="lb-you">You</span>}
				</span>
			</td>
			<td>{setLabel(entry.bestWeight, entry.bestReps)}</td>
			<td className="lb-col-date lb-muted">{formatDate(entry.achievedDate)}</td>
			<td className="lb-col-move">
				<Move change={entry.change} />
			</td>
		</tr>
	);
}

function BoardCard({
	boards,
	lift,
	onLift,
	period,
	onPeriod,
	me,
	standings,
	setLabel,
}) {
	const choices = liftChoices(boards, lift);
	const current =
		boards.find((b) => b.exerciseName === lift) ??
		boards.find((b) => b.exerciseName === choices[0]);
	const myStanding = standings.find(
		(s) => s.exerciseName === current?.exerciseName,
	);

	return (
		<section className="lb-card lb-board">
			<div className="lb-card-head">
				<div>
					<h2 className="lb-card-title">{current?.exerciseName ?? "Lifts"}</h2>
					{current && (
						<span className="lb-muted">
							{current.participantCount} lifters · best set (weight, then reps)
						</span>
					)}
				</div>
				<Segmented
					label="Period"
					options={PERIOD_OPTIONS}
					value={period}
					onChange={onPeriod}
				/>
			</div>
			{current ? (
				<>
					<div className="lb-chips" role="group" aria-label="Lift">
						{choices.map((name) => (
							<button
								key={name}
								type="button"
								className={`lb-chip${name === current.exerciseName ? " on" : ""}`}
								aria-pressed={name === current.exerciseName}
								onClick={() => onLift(name)}
							>
								{name}
							</button>
						))}
					</div>
					<BoardTable
						board={current}
						rows={current.entries}
						me={me}
						myStanding={myStanding}
						setLabel={setLabel}
					/>
				</>
			) : (
				<p className="lb-empty">
					{period === "month"
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

function Standing({ me, onPick, selected, unit, toDisplay, setLabel }) {
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
	const standings = [...me.standings].sort(
		(a, b) => featuredIndex(a.exerciseName) - featuredIndex(b.exerciseName),
	);
	return (
		<div className="lb-standing">
			{standings.map((s) => (
				<button
					key={s.exerciseName}
					type="button"
					className={`lb-stand${s.exerciseName === selected ? " on" : ""}`}
					onClick={() => onPick(s.exerciseName)}
				>
					<span className="lb-stand-lift">{s.exerciseName}</span>
					<span className="lb-stand-rank">
						#{s.rank} <small>of {s.participantCount}</small>{" "}
						<Move change={s.change} />
					</span>
					<span className="lb-muted">{setLabel(s.bestWeight, s.bestReps)}</span>
					<span className="lb-bar" aria-hidden="true">
						<i style={{ width: `${progress(s)}%` }} />
					</span>
					<span className="lb-muted">{gapText(s, unit, toDisplay)}</span>
				</button>
			))}
		</div>
	);
}

function MostActive({ users, me }) {
	return (
		<section className="lb-card">
			<div className="lb-card-head">
				<h2 className="lb-card-title">Most active</h2>
			</div>
			{users.length ? (
				<ol className="lb-active">
					{users.map((u) => (
						<li
							key={u.username}
							className={u.username === me ? "me" : undefined}
						>
							<Rank n={u.rank} />
							<span className="lb-name">{u.username}</span>
							<span className="lb-muted">{u.sessionCount} sessions</span>
						</li>
					))}
				</ol>
			) : (
				<p className="lb-empty">No sessions yet.</p>
			)}
		</section>
	);
}

function SessionsChart({ activity }) {
	const data = activity.map((p) => ({
		date: formatDate(p.date),
		sessions: p.sessionCount,
	}));
	return (
		<section className="lb-card">
			<div className="lb-card-head">
				<h2 className="lb-card-title">Community sessions</h2>
				<span className="lb-muted">Last 30 days</span>
			</div>
			<ResponsiveContainer width="100%" height={140}>
				<BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
					<XAxis
						dataKey="date"
						interval={Math.max(0, Math.floor(data.length / 3))}
						tick={{ fontSize: 11, fill: "var(--muted)" }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis hide allowDecimals={false} />
					<Tooltip cursor={{ fill: "var(--hover-bg)" }} />
					<Bar
						dataKey="sessions"
						name="Sessions"
						fill="var(--accent)"
						radius={[3, 3, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
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
					ProgressLog tracks your workouts, meals, weight and steps. Lifters who
					opt in are ranked on every lift, so you always know what to chase
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

export default function Community() {
	const authenticated = useAuthStore((s) => s.authenticated);
	const username = useAuthStore((s) => s.username);
	const { unit, toDisplay } = useWeightUnit();

	const [view, setView] = useState("leaderboard");
	const [period, setPeriod] = useState("month");
	const [lift, setLift] = useState(null);
	const { data, error } = useLeaderboard(period);

	const setLabel = (weight, reps) =>
		`${toDisplay(Number(weight)).toLocaleString()} ${unit} × ${reps}`;
	const boards = data?.exercises ?? [];
	const me = authenticated ? data?.me : null;
	const standings = me?.sharing ? me.standings : [];
	// A lift picked under another period may have no board now; fall back to the first.
	const selected = boards.some((b) => b.exerciseName === lift)
		? lift
		: (liftChoices(boards, null)[0] ?? null);

	const board = (
		<BoardCard
			boards={boards}
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
		<Segmented
			label="View"
			options={VIEW_OPTIONS}
			value={view}
			onChange={setView}
			className="lb-view"
		/>
	);

	if (!authenticated) {
		return (
			<div className="lb-page lb-public">
				<header className="lb-topbar">
					<span className="lb-brand">ProgressLog</span>
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
							<Hero
								board={boards.find((b) => b.exerciseName === selected)}
								setLabel={setLabel}
							/>
							{content ?? (
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

	const month = new Date().toLocaleString("en-US", { month: "long" });
	return (
		<div className="lb-page">
			<header className="lb-head">
				<div>
					<h1 className="lb-title">Community</h1>
					{data && data.totalUsers > 0 && (
						<span className="lb-muted">
							{data.totalUsers} lifters sharing ·{" "}
							{period === "month" ? month : "all time"}
						</span>
					)}
				</div>
				{viewSwitch}
			</header>
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
								<MostActive users={data.mostActive} me={username} />
								<SessionsChart activity={data.activity} />
							</aside>
						</div>
					</>
				))
			)}
		</div>
	);
}
