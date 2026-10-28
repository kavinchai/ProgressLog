import { useEffect, useRef, useState } from "react";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import useWeightUnit from "../hooks/useWeightUnit";
import DayDetail from "../components/DayDetail";
import RangeSelector from "../components/RangeSelector";
import {
	DailyBarChart,
	WeightTrendChart,
	WorkoutGrid,
} from "../components/HistoryCharts";
import { localDateStr, formatDate, shortDate } from "../utils/date";
import { buildDayRows } from "../utils/stats";
import { rangeDaysFor } from "../utils/dateRange";
import {
	datesBetween,
	summarize,
	weeklyAverages,
	workoutCountsByDate,
	shadeAlpha,
} from "../utils/history";
import "./WeeklyStats.css";
import "./TotalStats.css";
import "./History.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEPS_GOAL = 10000;

function emptyRow(date) {
	return {
		date,
		weightEntry: null,
		nutritionEntry: null,
		workoutEntry: null,
		stepEntry: null,
		weight: null,
		calories: null,
		protein: null,
		steps: null,
		workout: null,
	};
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

const fmt = (n) => (n == null ? "--" : Math.round(n).toLocaleString());

function Kpi({ label, value, children }) {
	return (
		<div className="history-kpi" role="group" aria-label={label}>
			<span className="history-kpi-label">{label}</span>
			<span className="history-kpi-value">{value}</span>
			<span className="history-kpi-sub">{children}</span>
		</div>
	);
}

export default function TotalStats() {
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const { goals } = useUserProfile();
	const { unit, toDisplay } = useWeightUnit();

	const [selectedDay, setSelectedDay] = useState(null);
	const dayPanelRef = useRef(null);

	// The day panel sits below the calendar, so bring it into view on select.
	useEffect(() => {
		if (selectedDay) {
			dayPanelRef.current?.scrollIntoView?.({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [selectedDay]);
	const [logMonth, setLogMonth] = useState(null);
	const [picker, setPicker] = useState(null);
	const [metric, setMetric] = useState("calories");
	const [range, setRange] = useState("3M");

	const today = localDateStr(new Date());

	const allDates = [
		...new Set([
			...weightData.map((x) => x.logDate),
			...nutritionData.map((x) => x.logDate),
			...workoutData.map((x) => x.sessionDate),
			...stepData.map((x) => x.logDate),
		]),
	].sort((a, b) => b.localeCompare(a));

	const rows = buildDayRows(
		allDates,
		weightData,
		nutritionData,
		workoutData,
		stepData,
	);
	const rowFor = (date) => rows.find((r) => r.date === date) ?? emptyRow(date);

	const allMonths = [...new Set(allDates.map((d) => d.slice(0, 7)))].sort();
	const currentMonth = today.slice(0, 7);
	// Months reachable via Prev/Next: every month that has data, plus the
	// current month — which is where the calendar opens even before anything
	// is logged this month. Without it, monthIdx is -1 on first load and Prev
	// gets disabled.
	const navMonths = [...new Set([...allMonths, currentMonth])].sort();
	const activeMonth = logMonth ?? currentMonth;
	const monthIdx = navMonths.indexOf(activeMonth);
	const [activeYear, activeMonthNum] = activeMonth.split("-");

	const monthDates = (() => {
		if (activeMonth > currentMonth) return [];
		const [y, m] = activeMonth.split("-").map(Number);
		const lastOfMonth = localDateStr(new Date(y, m, 0));
		return datesBetween(
			`${activeMonth}-01`,
			lastOfMonth < today ? lastOfMonth : today,
		);
	})();
	const monthRows = monthDates.map(rowFor);
	const month = summarize(monthRows);
	const monthWeights = monthRows.filter((r) => r.weight != null);

	// Calendar grid: leading blanks, then every day of the month.
	const calendarCells = (() => {
		const [y, m] = activeMonth.split("-").map(Number);
		const firstDow = new Date(y, m - 1, 1).getDay();
		const numDays = new Date(y, m, 0).getDate();
		const cells = [];
		for (let i = 0; i < firstDow; i++) cells.push(null);
		for (let d = 1; d <= numDays; d++) {
			cells.push(rowFor(localDateStr(new Date(y, m - 1, d))));
		}
		return cells;
	})();

	// Heat shading per metric. Weight has no goal, so it's shaded relative to
	// the month's lightest → heaviest day.
	const minW = Math.min(...monthWeights.map((r) => r.weight));
	const maxW = Math.max(...monthWeights.map((r) => r.weight));
	const METRICS = {
		calories: {
			label: "Calories",
			show: (r) => fmt(r.calories),
			value: (r) => r.calories,
			goal: (r) =>
				r.nutritionEntry?.dayType === "rest"
					? goals.calorieTargetRest
					: goals.calorieTargetTraining,
			unit: "kcal",
		},
		protein: {
			label: "Protein",
			show: (r) => `${fmt(r.protein)}g`,
			value: (r) => r.protein,
			goal: () => goals.proteinTarget,
			unit: "",
		},
		steps: {
			label: "Steps",
			show: (r) => fmt(r.steps),
			value: (r) => r.steps,
			goal: () => STEPS_GOAL,
			unit: "steps",
		},
		weight: {
			label: "Weight",
			show: (r) => `${toDisplay(r.weight)}`,
			value: (r) => (r.weight == null ? null : r.weight - minW),
			goal: () => Math.max(maxW - minW, 1),
			unit,
		},
	};
	const active = METRICS[metric];

	function goMonth(ym) {
		setLogMonth(ym);
		setSelectedDay(null);
		setPicker(null);
	}

	const allYears = [...new Set(allMonths.map((m) => m.slice(0, 4)))].sort();
	const monthsWithData = new Set(
		allMonths.filter((m) => m.startsWith(activeYear)).map((m) => m.slice(5, 7)),
	);

	function selectMonth(mm) {
		goMonth(`${activeYear}-${mm}`);
	}

	function selectYear(y) {
		const sameMonth = `${y}-${activeMonthNum}`;
		if (allMonths.includes(sameMonth)) {
			goMonth(sameMonth);
		} else {
			const yearMonths = allMonths.filter((m) => m.startsWith(y));
			goMonth(yearMonths[yearMonths.length - 1]);
		}
	}

	function togglePicker(type) {
		setPicker((p) => (p === type ? null : type));
	}

	const selectedRow = selectedDay ? rowFor(selectedDay) : null;

	// ── Trends over the chosen range ────────────────────────────────────────
	const rangeDays = rangeDaysFor(range);
	const trendStart = (() => {
		if (rangeDays == null) return allDates[allDates.length - 1] ?? today;
		const d = new Date(`${today}T00:00:00`);
		d.setDate(d.getDate() - rangeDays + 1);
		return localDateStr(d);
	})();
	const trendRows = datesBetween(trendStart, today).map(rowFor);
	const weightTrend = trendRows
		.filter((r) => r.weight != null)
		.map((r) => ({
			label: formatDate(r.date),
			value: Number(toDisplay(r.weight)),
		}));
	const caloriesPerWeek = weeklyAverages(trendRows, "calories").map((w) => ({
		label: formatDate(w.weekStart),
		value: w.value,
	}));
	const gridStart = (() => {
		const d = new Date(`${trendStart}T00:00:00`);
		d.setDate(d.getDate() - d.getDay());
		return localDateStr(d);
	})();
	const counts = workoutCountsByDate(workoutData);
	const gridDays = datesBetween(gridStart, today).map((date) => ({
		date,
		count: counts.get(date) ?? 0,
	}));

	const firstW = monthWeights[0]?.weight;
	const lastW = monthWeights[monthWeights.length - 1]?.weight;

	return (
		<div className="total-page">
			<div className="history-head">
				<span className="history-title">
					{MONTH_NAMES[parseInt(activeMonthNum) - 1]} {activeYear}
				</span>
				<span className="history-spacer" />
				{allMonths.length > 0 && (
					<div className="history-nav month-nav">
						<button
							type="button"
							aria-label="Prev month"
							onClick={() => goMonth(navMonths[monthIdx - 1])}
							disabled={monthIdx <= 0}
						>
							‹
						</button>
						<span className="month-nav-label">
							<button
								type="button"
								className={picker === "month" ? "range-active" : ""}
								onClick={() => togglePicker("month")}
							>
								{MONTH_NAMES[parseInt(activeMonthNum) - 1].slice(0, 3)}
							</button>
							<button
								type="button"
								className={picker === "year" ? "range-active" : ""}
								onClick={() => togglePicker("year")}
							>
								{activeYear}
							</button>
						</span>
						<button
							type="button"
							aria-label="Next month"
							onClick={() => goMonth(navMonths[monthIdx + 1])}
							disabled={monthIdx >= navMonths.length - 1}
						>
							›
						</button>
					</div>
				)}
			</div>
			{picker === "month" && (
				<div className="month-picker">
					{Array.from({ length: 12 }, (_, i) => {
						const mm = String(i + 1).padStart(2, "0");
						return (
							<button
								key={mm}
								className={
									"btn btn-sm" + (mm === activeMonthNum ? " range-active" : "")
								}
								onClick={() => selectMonth(mm)}
								disabled={!monthsWithData.has(mm)}
							>
								{MONTH_NAMES[i].slice(0, 3)}
							</button>
						);
					})}
				</div>
			)}
			{picker === "year" && (
				<div className="month-picker">
					{allYears.map((y) => (
						<button
							key={y}
							className={
								"btn btn-sm" + (y === activeYear ? " range-active" : "")
							}
							onClick={() => selectYear(y)}
						>
							{y}
						</button>
					))}
				</div>
			)}

			<div className="history-kpis">
				<Kpi
					label="Weight change"
					value={
						firstW == null
							? "--"
							: `${lastW - firstW > 0 ? "+" : ""}${(toDisplay(lastW) - toDisplay(firstW)).toFixed(1)}`
					}
				>
					{firstW == null
						? unit
						: `${toDisplay(firstW)} → ${toDisplay(lastW)} ${unit}`}
				</Kpi>
				<Kpi label="Avg calories" value={fmt(month.calories)}>
					target {fmt(goals.calorieTargetTraining)}
				</Kpi>
				<Kpi
					label="Avg protein"
					value={month.protein == null ? "--" : `${fmt(month.protein)}g`}
				>
					target {goals.proteinTarget}g
				</Kpi>
				<Kpi label="Avg steps" value={fmt(month.steps)}>
					goal {fmt(STEPS_GOAL)}
				</Kpi>
				<Kpi label="Workouts" value={month.workouts}>
					this month
				</Kpi>
			</div>

			<div className="history-day-panel">
				<div className="history-day-panel-head">
					<div className="history-seg" role="group" aria-label="Color days by">
						{Object.entries(METRICS).map(([key, m]) => (
							<button
								key={key}
								type="button"
								aria-pressed={metric === key}
								onClick={() => setMetric(key)}
							>
								{m.label}
							</button>
						))}
					</div>
					<span className="heatmap-legend">
						<span>less</span>
						{[0.12, 0.35, 0.6, 0.9].map((a) => (
							<i key={a} style={{ background: `rgba(255,107,53,${a})` }} />
						))}
						<span>more</span>
						<span className="heatmap-dot" style={{ marginLeft: 8 }} />
						<span>workout</span>
					</span>
				</div>
				<div className="history-day-panel-body">
					<div className="heatmap" aria-hidden="true">
						{WEEKDAYS.map((d) => (
							<span key={d} className="heatmap-dow">
								{d}
							</span>
						))}
					</div>
					<div className="heatmap" style={{ marginTop: 6 }}>
						{calendarCells.map((row, i) => {
							if (!row) {
								return (
									<span
										key={`pad-${i}`}
										className="heatmap-cell heatmap-cell--pad"
									/>
								);
							}
							const future = row.date > today;
							const v = active.value(row);
							const alpha = shadeAlpha(v, active.goal(row));
							const shown = v == null ? null : active.show(row);
							return (
								<button
									key={row.date}
									type="button"
									data-testid={`calendar-day-${row.date}`}
									className={
										"heatmap-cell" +
										(row.date === today ? " heatmap-cell--today" : "")
									}
									style={
										alpha == null
											? undefined
											: {
													background: `rgba(255,107,53,${alpha.toFixed(2)})`,
												}
									}
									disabled={future}
									aria-pressed={row.date === selectedDay}
									aria-label={
										`${shortDate(row.date)}: ` +
										(shown == null
											? "nothing logged"
											: `${active.label} ${shown}`) +
										(row.workout ? `, workout: ${row.workout}` : "")
									}
									onClick={() => setSelectedDay(row.date)}
								>
									<span className="heatmap-cell-top">
										<span>{parseInt(row.date.slice(8))}</span>
										{row.workout && <span className="heatmap-dot" />}
									</span>
									{shown != null && (
										<span className="heatmap-value">{shown}</span>
									)}
								</button>
							);
						})}
					</div>
					{!selectedDay && (
						<p className="muted history-calendar-hint">
							Select a day in the calendar to view or edit it.
						</p>
					)}
				</div>
			</div>

			{/* Selected day opens full width under the calendar (like Weekly). */}
			{selectedRow && (
				<section
					ref={dayPanelRef}
					className="history-day-panel"
					aria-label="Selected day"
				>
					<div className="history-day-panel-head">
						<span className="history-day-panel-title">
							{shortDate(selectedDay)}
						</span>
						<button
							type="button"
							className="btn btn-sm"
							aria-label="Close day"
							onClick={() => setSelectedDay(null)}
						>
							✕
						</button>
					</div>
					<div className="history-day-panel-body">
						<DayDetail
							key={selectedDay}
							date={selectedDay}
							weightEntry={selectedRow.weightEntry}
							nutritionEntry={selectedRow.nutritionEntry}
							workoutEntry={selectedRow.workoutEntry}
							stepEntry={selectedRow.stepEntry}
							onRefetchW={refetchWeight}
							onRefetchN={refetchNutrition}
							onRefetchWo={refetchWorkouts}
							onRefetchS={refetchSteps}
							showDelete={true}
						/>
					</div>
				</section>
			)}

			<h2 className="history-section-title">
				Trends
				<RangeSelector
					classPrefix="history"
					activeKey={range}
					onSelect={setRange}
				/>
			</h2>
			<div className="history-charts history-charts--stacked">
				<WeightTrendChart title="Weight trend" data={weightTrend} unit={unit} />
				<DailyBarChart
					title="Avg calories per week"
					data={caloriesPerWeek}
					goal={goals.calorieTargetTraining}
					color="#d4934e"
					unit="kcal"
				/>
				<WorkoutGrid title="Workout consistency" days={gridDays} />
			</div>
		</div>
	);
}
