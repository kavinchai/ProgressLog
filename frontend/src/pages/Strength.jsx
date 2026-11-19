import { useState, useMemo, lazy, Suspense } from "react";
import useFetch from "../hooks/useFetch";
import useWeightUnit from "../hooks/useWeightUnit";
import { formatDate } from "../utils/date";
import { ListFilter } from "lucide-react";
import { rangeDaysFor, filterByRange, RANGE_OPTIONS } from "../utils/dateRange";
import {
	ListGroup,
	ListRow,
	PageHeader,
	PullDownMenu,
	SegmentedControl,
} from "../components/ios/Ios";
import ChooseLiftsModal from "../components/ChooseLiftsModal";
import { loadChosen, saveChosen, sortLifts } from "../utils/chosenLifts";
import featuredConfig from "../config/featuredExercises.json";
import "./Strength.css";

const StrengthLineChart = lazy(
	() => import("../components/charts/StrengthLineChart"),
);

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
	)?.sessionDate;
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
		<Suspense fallback={<div style={{ height: 240 }} />}>
			<StrengthLineChart
				chartData={chartData}
				minVal={minVal}
				maxVal={maxVal}
				pad={pad}
				unit={unit}
			/>
		</Suspense>
	);
}

// ── stat card ─────────────────────────────────────────────────────────────────

// ── chosen lifts ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "strength.chosenLifts";
const DEFAULT_COUNT = 7;

const RANGE_WORDS = {
	"4W": "last 4 weeks",
	"3M": "last 3 months",
	"6M": "last 6 months",
	ALL: "all time",
};

const RANGE_MENU_LABELS = {
	"4W": "4 weeks",
	"3M": "3 months",
	"6M": "6 months",
	ALL: "All time",
};

const SORTS = [
	{ key: "recent", label: "Recent" },
	{ key: "change", label: "Biggest change" },
	{ key: "az", label: "Name" },
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

function formatChange(change) {
	if (change > 0) return `+${change}`;
	if (change < 0) return `${change}`;
	return "0";
}

function LiftRow({ lift, rangeLabel, unit, onOpen }) {
	const up = lift.change > 0;
	const down = lift.change < 0;
	return (
		<button
			type="button"
			aria-label={lift.name}
			className={"lift-row" + (lift.stale ? " lift-row-stale" : "")}
			onClick={() => onOpen(lift.name)}
		>
			<span className="lift-row-text">
				<span className="lift-row-name">{lift.name}</span>
				<span className="lift-row-sub">
					{lift.max} {unit} · {lastTrainedLabel(lift.lastDate)}
				</span>
			</span>
			<svg
				className="lift-row-spark"
				viewBox="0 0 100 30"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<polyline
					points={sparkPoints(lift.series)}
					fill="none"
					stroke={up ? "var(--success)" : "var(--text-subtle)"}
					strokeWidth="2"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<span
				className={
					"ios-badge" +
					(up ? "" : down ? " ios-badge--down" : " ios-badge--flat")
				}
				title={lift.stale ? `Not trained in ${rangeLabel}` : undefined}
			>
				{lift.stale ? "–" : formatChange(lift.change)}
			</span>
		</button>
	);
}

// Big number, chart, range and the lift's sessions.
function LiftDetail({ exercise, rangeKey, onRange, unit, toDisplay, onBack }) {
	const rangeDays = rangeDaysFor(rangeKey);
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

	const sortedSessions = [...filteredSessions].sort((a, b) =>
		b.sessionDate.localeCompare(a.sessionDate),
	);

	return (
		<div className="strength-detail">
			<PageHeader
				title={exercise.exerciseName}
				titleClassName="strength-detail-title"
				back={{ label: "Back to Progress", onClick: onBack }}
			/>

			{stats ? (
				<div className="strength-hero">
					<div className="strength-hero-value" data-testid="stat-current-max">
						{stats.currentMax} <small>{unit}</small>
					</div>
					<div
						className={
							"strength-hero-change" +
							(stats.improvement > 0 ? " strength-hero-up" : "")
						}
						data-testid="stat-improvement"
					>
						{stats.improvement >= 0 ? "+" : ""}
						{stats.improvement} {unit}{" "}
						<span className="muted">{RANGE_WORDS[rangeKey]}</span>
					</div>
				</div>
			) : (
				<div className="strength-no-data">
					<p>No sessions in selected range.</p>
					<p className="strength-empty-hint">
						Try a longer range like 6M or All.
					</p>
				</div>
			)}

			{filteredSessions.length > 0 && (
				<div className="strength-chart" data-no-page-swipe>
					<StrengthChart
						sessions={filteredSessions}
						prWeightLbs={stats?.prWeightLbs}
						unit={unit}
						toDisplay={toDisplay}
					/>
				</div>
			)}

			<SegmentedControl
				label="Time range"
				className="strength-range"
				options={RANGE_OPTIONS.map((r) => ({ value: r.key, label: r.label }))}
				value={rangeKey}
				onChange={onRange}
			/>

			{stats && (
				<ListGroup className="strength-facts">
					<ListRow
						label="Personal record"
						value={`${stats.currentMax} ${unit} · ${formatDate(stats.prDate)}`}
					/>
					<div data-testid="stat-sessions">
						<ListRow label="Sessions" value={stats.sessions} />
					</div>
					<div data-testid="stat-last-trained">
						<ListRow
							label="Last trained"
							value={
								stats.lastTrained.charAt(0).toUpperCase() +
								stats.lastTrained.slice(1)
							}
						/>
					</div>
				</ListGroup>
			)}

			{sortedSessions.length > 0 && (
				<ListGroup
					header={
						<>
							<span>Sessions</span>
							<span>{sortedSessions.length}</span>
						</>
					}
				>
					<div data-testid="session-history-table">
						{sortedSessions.map((s) => {
							const isPR =
								stats &&
								Number(s.maxWeightLbs) === stats.prWeightLbs &&
								s.sessionDate === stats.prDate;
							return (
								<div
									key={`${s.sessionDate}-${s.maxWeightLbs}`}
									className={"ios-row" + (isPR ? " strength-pr-row" : "")}
								>
									<span className="ios-row-text">
										<span className="ios-row-label">
											{formatDate(s.sessionDate)}
											{isPR && <span className="strength-pr-tag">PR</span>}
										</span>
									</span>
									<span className="ios-row-value">
										{toDisplay(Number(s.maxWeightLbs))} {unit} · {s.repScheme}
									</span>
								</div>
							);
						})}
					</div>
				</ListGroup>
			)}
		</div>
	);
}

// ── page ──────────────────────────────────────────────────────────────────────

// `above` goes between the title and the lift list (the Achievements card).
export default function Strength({ above = null }) {
	// Cached, so reopening the page shows the last data while it refreshes.
	const { data: progressData, loading, error } = useFetch("/progress/strength");
	const [openName, setOpenName] = useState(null);
	const [rangeKey, setRangeKey] = useState("3M");
	const [sortKey, setSortKey] = useState("recent");
	const [savedChosen, setSavedChosen] = useState(() => loadChosen(STORAGE_KEY));
	const [choosing, setChoosing] = useState(false);
	const { unit, toDisplay } = useWeightUnit();

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

	// Opening or leaving a lift starts at the top, like pushing a screen.
	function openLift(name) {
		setOpenName(name);
		window.scrollTo(0, 0);
	}

	const opened = useMemo(
		() => progressData.find((e) => e.exerciseName === openName) ?? null,
		[progressData, openName],
	);

	if (loading)
		return <div className="loading-state">Loading strength data…</div>;
	if (error) return <div className="error-state">Error: {error}</div>;

	if (opened) {
		return (
			<div className="strength-page">
				<LiftDetail
					exercise={opened}
					rangeKey={rangeKey}
					onRange={setRangeKey}
					unit={unit}
					toDisplay={toDisplay}
					onBack={() => openLift(null)}
				/>
			</div>
		);
	}

	if (!lifts.length) {
		return (
			<div className="strength-page">
				<PageHeader title="Progress" />
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
			<PageHeader
				title="Progress"
				subtitle={`Best set per session · ${RANGE_WORDS[rangeKey]}`}
				below={
					<>
						<button type="button" onClick={() => setChoosing(true)}>
							Edit
						</button>
						<PullDownMenu
							label="Sort and range"
							buttonLabel=""
							icon={<ListFilter size={22} aria-hidden="true" />}
							sections={[
								{
									title: "Sort by",
									options: SORTS.map((o) => ({ value: o.key, label: o.label })),
									value: sortKey,
									onChange: setSortKey,
								},
								{
									title: "Range",
									options: RANGE_OPTIONS.map((r) => ({
										value: r.key,
										label: RANGE_MENU_LABELS[r.key],
									})),
									value: rangeKey,
									onChange: setRangeKey,
								},
							]}
						/>
					</>
				}
			/>

			{above}

			{cards.length === 0 ? (
				<div className="strength-empty">
					<p>No lifts chosen.</p>
					<p className="strength-empty-hint">
						Tap Edit to pick the exercises to track here.
					</p>
				</div>
			) : (
				<ListGroup
					header="Lifts"
					footer={`${cards.length} of ${lifts.length} lifts shown. Tap Edit to choose which appear.`}
				>
					<div className="lift-list" data-testid="lift-grid">
						{cards.map((lift) => (
							<LiftRow
								key={lift.name}
								lift={lift}
								rangeLabel={rangeKey}
								unit={unit}
								onOpen={openLift}
							/>
						))}
					</div>
				</ListGroup>
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
