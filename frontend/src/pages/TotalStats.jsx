import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import useWeightUnit from "../hooks/useWeightUnit";
import DayDetail from "../components/DayDetail";
import Modal from "../components/Modal";
import useMediaQuery, { MOBILE_QUERY } from "../hooks/useMediaQuery";
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
import { PeriodNav, StatTile } from "../components/ios/Ios";
import useSwipe from "../hooks/useSwipe";
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

export default function TotalStats() {
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const { goals } = useUserProfile();
	const stepsGoal = goals.stepsTarget ?? STEPS_GOAL;
	const { unit, toDisplay } = useWeightUnit();

	const isMobile = useMediaQuery(MOBILE_QUERY);
	const [selectedDay, setSelectedDay] = useState(null);
	const dayPanelRef = useRef(null);

	// Desktop: the day panel sits below the calendar, so bring it into view.
	// Phones open the day in a bottom sheet instead.
	useEffect(() => {
		if (selectedDay && !isMobile) {
			dayPanelRef.current?.scrollIntoView?.({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [selectedDay, isMobile]);
	const [logMonth, setLogMonth] = useState(null);
	const [pickerOpen, setPickerOpen] = useState(false);
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
	const monthName = MONTH_NAMES[parseInt(activeMonthNum) - 1];

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
	// Workout days are shaded by set count, relative to the month's biggest session.
	const setCount = (r) => r.workoutEntry?.exerciseSets?.length ?? 0;
	const maxSets = Math.max(1, ...monthRows.map(setCount));
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
			goal: () => stepsGoal,
			unit: "steps",
		},
		weight: {
			label: "Weight",
			show: (r) => `${toDisplay(r.weight)}`,
			value: (r) => (r.weight == null ? null : r.weight - minW),
			goal: () => Math.max(maxW - minW, 1),
			unit,
		},
		workout: {
			label: "Workout",
			show: (r) => r.workout,
			value: (r) => (r.workout == null ? null : setCount(r)),
			goal: () => maxSets,
			unit: "",
		},
	};
	const active = METRICS[metric];

	// Previous / next day inside the phone sheet; follows into the adjacent month.
	function stepDay(delta) {
		const d = new Date(`${selectedDay}T00:00:00`);
		d.setDate(d.getDate() + delta);
		const next = localDateStr(d);
		if (next > today) return;
		if (next.slice(0, 7) !== activeMonth) setLogMonth(next.slice(0, 7));
		setSelectedDay(next);
	}

	function goPrevMonth() {
		if (monthIdx > 0) goMonth(navMonths[monthIdx - 1]);
	}

	function goNextMonth() {
		if (monthIdx < navMonths.length - 1) goMonth(navMonths[monthIdx + 1]);
	}

	function goMonth(ym) {
		setLogMonth(ym);
		setSelectedDay(null);
		setPickerOpen(false);
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

	const swipe = useSwipe({ onLeft: goNextMonth, onRight: goPrevMonth });

	const firstW = monthWeights[0]?.weight;
	const lastW = monthWeights[monthWeights.length - 1]?.weight;

	return (
		<div className="total-page ios-swipe" {...swipe}>
			<PeriodNav
				title={
					<button
						type="button"
						className="history-title-btn"
						aria-expanded={pickerOpen}
						onClick={() => setPickerOpen((open) => !open)}
					>
						<span className="history-title-text">
							{monthName} {activeYear}
						</span>
						{pickerOpen ? (
							<ChevronUp size={18} aria-hidden="true" />
						) : (
							<ChevronDown size={18} aria-hidden="true" />
						)}
					</button>
				}
				sub={activeMonth === currentMonth ? "This month" : null}
				prevLabel="Previous month"
				nextLabel="Next month"
				onPrev={goPrevMonth}
				onNext={goNextMonth}
				prevDisabled={monthIdx <= 0}
				nextDisabled={monthIdx >= navMonths.length - 1}
			/>
			{pickerOpen && (
				<div className="month-picker">
					<div className="month-picker-years">
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
					<div className="month-picker-months">
						{MONTH_NAMES.map((name, i) => {
							const mm = String(i + 1).padStart(2, "0");
							return (
								<button
									key={mm}
									className={
										"btn btn-sm" +
										(mm === activeMonthNum ? " range-active" : "")
									}
									onClick={() => selectMonth(mm)}
									disabled={!monthsWithData.has(mm)}
								>
									{name.slice(0, 3)}
								</button>
							);
						})}
					</div>
				</div>
			)}

			<div className="ios-tiles ios-tiles--five" role="group" aria-label="Color days by">
				<StatTile
					label="Weight"
					value={
						firstW == null
							? "--"
							: `${lastW - firstW > 0 ? "+" : ""}${(toDisplay(lastW) - toDisplay(firstW)).toFixed(1)}`
					}
					unit={unit}
					sub={
						firstW == null ? null : `${toDisplay(firstW)} → ${toDisplay(lastW)}`
					}
					selected={metric === "weight"}
					onSelect={() => setMetric("weight")}
				/>
				<StatTile
					label="Calories"
					value={fmt(month.calories)}
					sub={`goal ${fmt(goals.calorieTargetTraining)}`}
					selected={metric === "calories"}
					onSelect={() => setMetric("calories")}
				/>
				<StatTile
					label="Protein"
					value={month.protein == null ? "--" : fmt(month.protein)}
					unit="g"
					sub={`goal ${goals.proteinTarget}`}
					selected={metric === "protein"}
					onSelect={() => setMetric("protein")}
				/>
				<StatTile
					label="Steps"
					value={fmt(month.steps)}
					sub={`goal ${fmt(stepsGoal)}`}
					selected={metric === "steps"}
					onSelect={() => setMetric("steps")}
				/>
				<StatTile
					label="Workouts"
					value={month.workouts}
					sub="this month"
					selected={metric === "workout"}
					onSelect={() => setMetric("workout")}
				/>
			</div>

			<div className="history-day-panel">
				<div className="history-day-panel-head">
					<span className="history-day-panel-title">{active.label} per day</span>
					<span className="heatmap-legend">
						<span>less</span>
						{[0.12, 0.35, 0.6, 0.9].map((a) => (
							<i key={a} style={{ background: `rgba(79,70,229,${a})` }} />
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
													background: `rgba(79,70,229,${alpha.toFixed(2)})`,
												}
									}
									disabled={future}
									aria-pressed={row.date === selectedDay}
									aria-label={
										`${shortDate(row.date)}: ` +
										(shown == null
											? "nothing logged"
											: `${active.label} ${shown}`) +
										// The Workout metric already names the session.
										(row.workout && metric !== "workout"
											? `, workout: ${row.workout}`
											: "")
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
									{metric === "workout" && setCount(row) > 0 && (
										<span className="heatmap-sub">
											{setCount(row)} {setCount(row) === 1 ? "set" : "sets"}
										</span>
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

			{/* Phones: the selected day opens in a bottom sheet. */}
			{selectedRow && isMobile && (
				<Modal
					title={shortDate(selectedDay)}
					onClose={() => setSelectedDay(null)}
				>
					<div className="history-sheet-nav">
						<button
							type="button"
							className="btn btn-sm"
							aria-label="Previous day"
							onClick={() => stepDay(-1)}
						>
							‹ Previous
						</button>
						<button
							type="button"
							className="btn btn-sm"
							aria-label="Next day"
							disabled={selectedDay >= today}
							onClick={() => stepDay(1)}
						>
							Next ›
						</button>
					</div>
					<DayDetail
						key={selectedDay}
						date={selectedDay}
						weightEntry={selectedRow.weightEntry}
						nutritionEntry={selectedRow.nutritionEntry}
						nutritionData={nutritionData}
						workoutEntry={selectedRow.workoutEntry}
						stepEntry={selectedRow.stepEntry}
						onRefetchW={refetchWeight}
						onRefetchN={refetchNutrition}
						onRefetchWo={refetchWorkouts}
						onRefetchS={refetchSteps}
						showDelete={true}
						workoutOnly={metric === "workout"}
					/>
				</Modal>
			)}

			{/* Desktop: the selected day opens full width under the calendar. */}
			{selectedRow && !isMobile && (
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
							nutritionData={nutritionData}
							workoutEntry={selectedRow.workoutEntry}
							stepEntry={selectedRow.stepEntry}
							onRefetchW={refetchWeight}
							onRefetchN={refetchNutrition}
							onRefetchWo={refetchWorkouts}
							onRefetchS={refetchSteps}
							showDelete={true}
							workoutOnly={metric === "workout"}
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
