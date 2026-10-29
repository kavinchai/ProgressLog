import { useState, useEffect, useMemo } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import api from "../api";
import useWeightUnit from "../hooks/useWeightUnit";
import { formatDate } from "../utils/date";
import { rangeDaysFor, filterByRange } from "../utils/dateRange";
import RangeSelector from "../components/RangeSelector";
import ChooseLiftsModal from "../components/ChooseLiftsModal";
import { loadChosen, saveChosen, sortLifts } from "../utils/chosenLifts";
import featuredConfig from "../config/featuredExercises.json";
import "./Strength.css";

// ── helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr) {
	const date = new Date(dateStr + "T00:00:00");
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.round((today.getTime() - date.getTime()) / 86400000);
}

function lastTrainedLabel(dateStr) {
	const n = daysSince(dateStr);
	if (n <= 0) return "today";
	if (n === 1) return "yesterday";
	return `${n} days ago`;
}

// Roll up sessions to one entry per date (highest weight that day wins).
function rollupByDate(sessions) {
	const byDate = {};
	sessions.forEach((s) => {
		const existing = byDate[s.sessionDate];
		if (!existing || s.maxWeightLbs > existing.maxWeightLbs) {
			byDate[s.sessionDate] = s;
		}
	});
	return Object.values(byDate).sort((a, b) =>
		a.sessionDate.localeCompare(b.sessionDate),
	);
}

function computeStats(sessions, toDisplay) {
	if (!sessions.length) return null;
	const byDate = rollupByDate(sessions);
	const first = byDate[0];
	const last = byDate[byDate.length - 1];
	const maxLbs = Math.max(...byDate.map((s) => Number(s.maxWeightLbs)));
	const prDate = byDate.find(
		(s) => Number(s.maxWeightLbs) === maxLbs,
	).sessionDate;
	const improvLbs = Number(last.maxWeightLbs) - Number(first.maxWeightLbs);
	return {
		currentMax: toDisplay(maxLbs),
		sessions: byDate.length,
		improvement: Math.round(toDisplay(improvLbs) * 10) / 10,
		lastTrained: lastTrainedLabel(last.sessionDate),
		prDate,
		prWeightLbs: maxLbs,
	};
}

// ── chart ─────────────────────────────────────────────────────────────────────

function StrengthChart({ sessions, prWeightLbs, unit, toDisplay }) {
	const byDate = rollupByDate(sessions);
	const chartData = byDate.map((s) => ({
		label: formatDate(s.sessionDate),
		weight: toDisplay(Number(s.maxWeightLbs)),
		isPR: Number(s.maxWeightLbs) === prWeightLbs,
	}));
	if (!chartData.length) return null;
	const vals = chartData.map((d) => d.weight);
	const minVal = Math.min(...vals);
	const maxVal = Math.max(...vals);
	const pad = (maxVal - minVal) * 0.15 || 5;

	return (
		<ResponsiveContainer width="100%" height={240}>
			<LineChart
				data={chartData}
				margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
			>
				<CartesianGrid
					strokeDasharray="2 4"
					stroke="var(--border-dim)"
					vertical={false}
				/>
				<XAxis
					dataKey="label"
					tick={{
						fill: "var(--muted)",
						fontSize: 11,
						fontFamily: "var(--font)",
					}}
					axisLine={{ stroke: "var(--border-dim)" }}
					tickLine={false}
				/>
				<YAxis
					domain={[minVal - pad, maxVal + pad]}
					tick={{
						fill: "var(--muted)",
						fontSize: 11,
						fontFamily: "var(--font)",
					}}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => v}
					width={48}
				/>
				<Tooltip
					content={({ active, payload, label }) =>
						active && payload?.length ? (
							<div className="chart-tooltip">
								<div className="chart-tooltip-label">{label}</div>
								<div className="chart-tooltip-value">
									{payload[0].value} {unit}
									{payload[0].payload.isPR && (
										<span className="chart-pr-tag"> PR</span>
									)}
								</div>
							</div>
						) : null
					}
				/>
				<Line
					type="linear"
					dataKey="weight"
					stroke="var(--accent)"
					strokeWidth={2}
					dot={({ cx, cy, payload, index }) =>
						payload.isPR ? (
							<circle
								key={`pr-${index}`}
								cx={cx}
								cy={cy}
								r={6}
								fill="var(--accent)"
								stroke="var(--bg-card)"
								strokeWidth={2}
							/>
						) : (
							<circle
								key={`dot-${index}`}
								cx={cx}
								cy={cy}
								r={3}
								fill="var(--accent)"
							/>
						)
					}
					activeDot={{ r: 5, fill: "var(--accent)" }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

// ── stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, testId, accent }) {
	return (
		<div className="strength-stat" data-testid={testId}>
			<span className="strength-stat-label">{label}</span>
			<span
				className={
					"strength-stat-value" + (accent ? " strength-stat-value-accent" : "")
				}
			>
				{value}
			</span>
		</div>
	);
}

// ── chosen lifts ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "strength.chosenLifts";
const DEFAULT_COUNT = 7;

const RANGE_WORDS = {
	"4W": "last 4 weeks",
	"3M": "last 3 months",
	"6M": "last 6 months",
	ALL: "all time",
};

const SORTS = [
	{ key: "recent", label: "Recent" },
	{ key: "change", label: "Change" },
	{ key: "az", label: "A–Z" },
];

// Featured lifts the user has logged; if none, their most recently trained.
function defaultChosen(lifts) {
	const featured = new Set(
		(featuredConfig.strength ?? []).map((n) => n.toLowerCase()),
	);
	const picked = lifts.filter((l) => featured.has(l.name.toLowerCase()));
	if (picked.length) return picked.map((l) => l.name);
	return [...lifts]
		.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
		.slice(0, DEFAULT_COUNT)
		.map((l) => l.name);
}

// Card summary for one exercise over the selected range. A lift with no
// sessions in range is `stale`: it shows its all-time max and no change.
function summarize(exercise, rangeDays, toDisplay) {
	const all = rollupByDate(exercise.data);
	const inRange = rollupByDate(filterByRange(exercise.data, rangeDays));
	const series = (inRange.length ? inRange : all).map((s) =>
		toDisplay(Number(s.maxWeightLbs)),
	);
	const stale = inRange.length === 0;
	return {
		name: exercise.exerciseName,
		lastDate: all[all.length - 1].sessionDate,
		stale,
		max: Math.max(...series),
		change: stale
			? null
			: Math.round((series[series.length - 1] - series[0]) * 10) / 10,
		series,
	};
}

function sparkPoints(series) {
	const lo = Math.min(...series);
	const span = Math.max(...series) - lo || 1;
	const step = series.length > 1 ? 100 / (series.length - 1) : 0;
	return series
		.map(
			(v, i) =>
				`${Math.round(i * step)},${Math.round(28 - ((v - lo) / span) * 24)}`,
		)
		.join(" ");
}

function formatChange(change, unit) {
	if (change > 0) return `+${change} ${unit}`;
	if (change < 0) return `${change} ${unit}`;
	return `±0 ${unit}`;
}

function LiftCard({ lift, active, rangeLabel, unit, onSelect }) {
	const up = lift.change > 0;
	return (
		<button
			type="button"
			aria-label={lift.name}
			aria-pressed={active}
			className={
				"lift-card" +
				(active ? " lift-card-active" : "") +
				(lift.stale ? " lift-card-stale" : "")
			}
			onClick={() => onSelect(lift.name)}
		>
			<span className="lift-card-text">
				<span className="lift-card-top">
					<span className="lift-card-name">{lift.name}</span>
					<span className="lift-card-last">
						{lastTrainedLabel(lift.lastDate)}
					</span>
				</span>
				<span className="lift-card-values">
					<span className="lift-card-max">
						{lift.max} {unit}
					</span>
					<span className={"lift-card-change" + (up ? " lift-card-up" : "")}>
						{lift.stale
							? `Not trained in ${rangeLabel}`
							: formatChange(lift.change, unit)}
					</span>
				</span>
			</span>
			<svg
				className="lift-card-spark"
				viewBox="0 0 100 30"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<polyline
					points={sparkPoints(lift.series)}
					fill="none"
					stroke={up ? "var(--accent)" : "var(--muted)"}
					strokeWidth="2"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</button>
	);
}

// Stats, chart and session table for the selected lift over the range.
function LiftDetail({ exercise, rangeDays, unit, toDisplay }) {
	const filteredSessions = useMemo(
		() => filterByRange(exercise.data, rangeDays),
		[exercise, rangeDays],
	);

	const stats = useMemo(
		() =>
			filteredSessions.length
				? computeStats(filteredSessions, toDisplay)
				: null,
		[filteredSessions, toDisplay],
	);

	// Sessions sorted by date descending for the table
	const sortedSessions = [...filteredSessions].sort((a, b) =>
		b.sessionDate.localeCompare(a.sessionDate),
	);

	return (
		<div className="strength-detail">
			<div className="strength-detail-head">
				<h2>{exercise.exerciseName}</h2>
				{stats && (
					<span className="strength-pr-tag">
						PR {stats.currentMax} {unit} · {formatDate(stats.prDate)}
					</span>
				)}
			</div>

			{/* Stat row */}
			{stats && (
				<div className="section-box strength-stats-box">
					<div className="strength-stats-grid">
						<Stat
							label="current max"
							value={`${stats.currentMax} ${unit}`}
							testId="stat-current-max"
							accent
						/>
						<Stat
							label="sessions"
							value={stats.sessions}
							testId="stat-sessions"
						/>
						<Stat
							label="improvement"
							value={`${stats.improvement >= 0 ? "+" : ""}${stats.improvement} ${unit}`}
							testId="stat-improvement"
						/>
						<Stat
							label="last trained"
							value={
								stats.lastTrained.charAt(0).toUpperCase() +
								stats.lastTrained.slice(1)
							}
							testId="stat-last-trained"
						/>
					</div>
				</div>
			)}

			{filteredSessions.length === 0 ? (
				<div className="section-box">
					<div className="section-body strength-no-data">
						<p>No sessions in selected range.</p>
						<p className="strength-empty-hint">
							Try a longer range like 6M or All.
						</p>
					</div>
				</div>
			) : (
				<div className="strength-detail-grid">
					{/* Chart */}
					<div className="section-box">
						<div className="section-header">
							<span className="section-title">Weight Progression</span>
							<span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
								PR highlighted
							</span>
						</div>
						<div className="section-body">
							<StrengthChart
								sessions={filteredSessions}
								prWeightLbs={stats?.prWeightLbs}
								unit={unit}
								toDisplay={toDisplay}
							/>
						</div>
					</div>

					{/* Session history */}
					<div className="section-box">
						<div className="section-header">
							<span className="section-title">Session History</span>
							<span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
								{sortedSessions.length}{" "}
								{sortedSessions.length === 1 ? "session" : "sessions"}
							</span>
						</div>
						<div className="section-body" style={{ padding: 0 }}>
							<div className="strength-table-wrap">
								<table
									className="strength-table"
									data-testid="session-history-table"
								>
									<thead>
										<tr>
											<th>Date</th>
											<th>Max Weight</th>
											<th>Sets</th>
											<th>Rep Scheme</th>
										</tr>
									</thead>
									<tbody>
										{sortedSessions.map((s) => {
											const isPR =
												stats &&
												Number(s.maxWeightLbs) === stats.prWeightLbs &&
												s.sessionDate === stats.prDate;
											return (
												<tr
													key={`${s.sessionDate}-${s.maxWeightLbs}`}
													className={isPR ? "strength-pr-row" : ""}
												>
													<td>{s.sessionDate}</td>
													<td className="strength-cell-weight">
														{toDisplay(Number(s.maxWeightLbs))} {unit}
														{isPR && (
															<span className="strength-pr-tag">PR</span>
														)}
													</td>
													<td>{s.setCount}</td>
													<td className="strength-cell-reps">{s.repScheme}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Strength() {
	const [progressData, setProgressData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedName, setSelectedName] = useState(null);
	const [rangeKey, setRangeKey] = useState("3M");
	const [sortKey, setSortKey] = useState("recent");
	const [savedChosen, setSavedChosen] = useState(() => loadChosen(STORAGE_KEY));
	const [choosing, setChoosing] = useState(false);
	const { unit, toDisplay } = useWeightUnit();

	useEffect(() => {
		api
			.get("/progress/strength")
			.then((res) => setProgressData(res.data))
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const rangeDays = rangeDaysFor(rangeKey);

	const lifts = useMemo(
		() =>
			progressData
				.filter((e) => e.data.length > 0)
				.map((e) => summarize(e, rangeDays, toDisplay)),
		[progressData, rangeDays, toDisplay],
	);

	const chosenNames = useMemo(() => {
		if (!savedChosen) return defaultChosen(lifts);
		const saved = new Set(savedChosen);
		return lifts.filter((l) => saved.has(l.name)).map((l) => l.name);
	}, [lifts, savedChosen]);

	const cards = useMemo(() => {
		const chosen = new Set(chosenNames);
		return sortLifts(
			lifts.filter((l) => chosen.has(l.name)),
			sortKey,
		);
	}, [lifts, chosenNames, sortKey]);

	const activeName = cards.some((c) => c.name === selectedName)
		? selectedName
		: (cards[0]?.name ?? null);

	const active = useMemo(
		() => progressData.find((e) => e.exerciseName === activeName) ?? null,
		[progressData, activeName],
	);

	if (loading)
		return <div className="loading-state">Loading strength data…</div>;
	if (error) return <div className="error-state">Error: {error}</div>;

	if (!lifts.length) {
		return (
			<div className="strength-page">
				<div className="strength-header">
					<h1>Strength</h1>
				</div>
				<div className="strength-empty">
					<p>No strength data logged yet.</p>
					<p className="strength-empty-hint">
						Log a workout from the Today page to start tracking your lifts.
					</p>
				</div>
			</div>
		);
	}

	const saveChoice = (names) => {
		saveChosen(STORAGE_KEY, names);
		setSavedChosen(names);
		setChoosing(false);
	};

	return (
		<div className="strength-page">
			<div className="strength-header">
				<div className="strength-title">
					<h1>Strength</h1>
					<p>
						{cards.length} {cards.length === 1 ? "lift" : "lifts"} ·{" "}
						{RANGE_WORDS[rangeKey]}
					</p>
				</div>
				<div className="strength-controls">
					<div
						className="strength-range-buttons"
						role="group"
						aria-label="Sort lifts"
					>
						{SORTS.map((o) => (
							<button
								key={o.key}
								type="button"
								aria-pressed={sortKey === o.key}
								className={
									"strength-range-btn" +
									(sortKey === o.key ? " strength-range-btn-active" : "")
								}
								onClick={() => setSortKey(o.key)}
							>
								{o.label}
							</button>
						))}
					</div>
					<RangeSelector
						classPrefix="strength"
						activeKey={rangeKey}
						onSelect={setRangeKey}
					/>
					<button
						type="button"
						className="btn btn-sm btn-primary strength-choose-btn"
						onClick={() => setChoosing(true)}
					>
						Choose lifts
						<span className="strength-choose-count">
							{cards.length} of {lifts.length}
						</span>
					</button>
				</div>
			</div>

			{cards.length === 0 ? (
				<div className="strength-empty">
					<p>No lifts chosen.</p>
					<p className="strength-empty-hint">
						Use Choose lifts to pick the exercises to track here.
					</p>
				</div>
			) : (
				<div className="lift-grid" data-testid="lift-grid">
					{cards.map((lift) => (
						<LiftCard
							key={lift.name}
							lift={lift}
							active={lift.name === activeName}
							rangeLabel={rangeKey}
							unit={unit}
							onSelect={setSelectedName}
						/>
					))}
				</div>
			)}

			{active && (
				<LiftDetail
					exercise={active}
					rangeDays={rangeDays}
					unit={unit}
					toDisplay={toDisplay}
				/>
			)}

			{choosing && (
				<ChooseLiftsModal
					lifts={lifts.map((l) => ({
						...l,
						note: lastTrainedLabel(l.lastDate),
						detail: `${l.max} ${unit}`,
					}))}
					chosen={chosenNames}
					defaults={defaultChosen(lifts)}
					recentLabel={
						rangeKey === "ALL"
							? "All lifts"
							: `Trained in the ${RANGE_WORDS[rangeKey]}`
					}
					rangeChipLabel={rangeKey === "ALL" ? null : `Trained in ${rangeKey}`}
					onSave={saveChoice}
					onClose={() => setChoosing(false)}
				/>
			)}
		</div>
	);
}
