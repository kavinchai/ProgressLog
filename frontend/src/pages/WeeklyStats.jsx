import { useState } from "react";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import useWeightUnit from "../hooks/useWeightUnit";
import DayDetail from "../components/DayDetail";
import { DailyBarChart, WeightTrendChart } from "../components/HistoryCharts";
import { PeriodNav, StatTile } from "../components/ios/Ios";
import useSwipe from "../hooks/useSwipe";
import { localDateStr, shortDate, getWeek } from "../utils/date";
import { buildDayRows } from "../utils/stats";
import { summarize } from "../utils/history";
import "./WeeklyStats.css";
import "./History.css";

const STEPS_GOAL = 10000;
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHART_COLORS = {
	calories: "#d4934e",
	protein: "#2f8f5b",
	steps: "#8a7ec8",
};

const monthDay = (iso) => {
	const [, m, d] = iso.split("-");
	return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`;
};
// "Oct 25 – 31", or "Sep 27 – Oct 3" when the week spans two months.
const weekRange = (start, end) =>
	start.slice(0, 7) === end.slice(0, 7)
		? `${monthDay(start)} – ${parseInt(end.slice(8))}`
		: `${monthDay(start)} – ${monthDay(end)}`;
const pct = (value, goal) =>
	value == null || !goal ? 0 : Math.min(100, Math.round((value / goal) * 100));
const fmt = (n) => (n == null ? "--" : Math.round(n).toLocaleString());

function Delta({ current, previous, unit = "" }) {
	if (current == null || previous == null) return null;
	const diff = current - previous;
	if (Math.abs(diff) < 0.05) return <>same as last week</>;
	const shown = Number.isInteger(diff)
		? Math.abs(diff).toLocaleString()
		: Math.abs(diff).toFixed(1);
	return (
		<>
			{diff > 0 ? "▲" : "▼"} {shown}
			{unit} vs last week
		</>
	);
}

function DayCard({
	row,
	today,
	selected,
	onSelect,
	toDisplay,
	calorieGoal,
	proteinGoal,
	stepsGoal,
}) {
	const future = row.date > today;
	const dow = DOW[new Date(`${row.date}T12:00:00`).getDay()];
	const metrics = [
		{
			key: "calories",
			label: "kcal",
			value: row.calories,
			goal: calorieGoal(row),
		},
		{
			key: "protein",
			label: "protein",
			value: row.protein,
			goal: proteinGoal,
			suffix: "g",
		},
		{ key: "steps", label: "steps", value: row.steps, goal: stepsGoal },
	];
	return (
		<button
			type="button"
			className={"week-day" + (row.date === today ? " week-day--today" : "")}
			aria-label={shortDate(row.date)}
			aria-pressed={selected}
			disabled={future}
			onClick={() => onSelect(row.date)}
		>
			<span className="week-day-top">
				<span className="week-day-dow">{dow}</span>
				<span className="week-day-date">{parseInt(row.date.slice(8))}</span>
			</span>
			{/* Phones show just day, date and this workout dot. */}
			<span
				className={"week-day-dot" + (row.workout && !future ? " on" : "")}
				aria-hidden="true"
			/>
			{future ? (
				<span className="week-day-chip week-day-chip--rest">Upcoming</span>
			) : (
				<>
					<span
						className={
							"week-day-chip" + (row.workout ? "" : " week-day-chip--rest")
						}
					>
						{row.workout ?? "Rest"}
					</span>
					{metrics.map((m) => (
						<span key={m.key} className="week-day-metric">
							<span className="week-day-metric-row">
								<span>{m.label}</span>
								<b>
									{m.value == null ? "--" : fmt(m.value) + (m.suffix ?? "")}
								</b>
							</span>
							<span className="week-day-track">
								<span
									className={`week-day-fill week-day-fill--${m.key}`}
									style={{
										display: "block",
										width: `${pct(m.value, m.goal)}%`,
									}}
								/>
							</span>
						</span>
					))}
					<span className="week-day-metric-row">
						<span>weight</span>
						<b>{row.weight == null ? "--" : toDisplay(row.weight)}</b>
					</span>
				</>
			)}
		</button>
	);
}

export default function WeeklyStats() {
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const { goals } = useUserProfile();
	const stepsGoal = goals.stepsTarget ?? STEPS_GOAL;
	const { unit, toDisplay } = useWeightUnit();

	const [offset, setOffset] = useState(0);
	const [selected, setSelected] = useState(null);
	const [chartShow, setChartShow] = useState("calories");

	const today = localDateStr(new Date());
	const days = getWeek(offset);
	const rows = buildDayRows(
		days,
		weightData,
		nutritionData,
		workoutData,
		stepData,
	);
	const prevRows = buildDayRows(
		getWeek(offset - 1),
		weightData,
		nutritionData,
		workoutData,
		stepData,
	);
	const week = summarize(rows.filter((r) => r.date <= today));
	const lastWeek = summarize(prevRows);

	const calorieGoal = (row) =>
		row.nutritionEntry?.dayType === "rest"
			? goals.calorieTargetRest
			: goals.calorieTargetTraining;

	// Default selection: today on the current week, otherwise the week's last day.
	const selectedDate =
		selected && days.includes(selected)
			? selected
			: offset === 0
				? today
				: days[6];
	const selectedRow = rows.find((r) => r.date === selectedDate);

	function goWeek(delta) {
		setOffset((o) => o + delta);
		setSelected(null);
	}

	const chartData = (field) =>
		rows.map((r) => ({
			label: DOW[new Date(`${r.date}T12:00:00`).getDay()],
			value: r.date > today ? null : r[field],
		}));

	const swipe = useSwipe({
		onLeft: () => offset < 0 && goWeek(1),
		onRight: () => goWeek(-1),
		canLeft: offset < 0,
	});

	const weightShown = (v) => (v == null ? null : Number(toDisplay(v)));
	const metrics = {
		weight: {
			label: "Weight",
			value: week.weight == null ? "--" : toDisplay(week.weight),
			unit,
			sub: (
				<Delta
					current={weightShown(week.weight)}
					previous={weightShown(lastWeek.weight)}
				/>
			),
		},
		calories: {
			label: "Calories",
			value: fmt(week.calories),
			sub: `goal ${fmt(goals.calorieTargetTraining)}`,
		},
		protein: {
			label: "Protein",
			value: week.protein == null ? "--" : fmt(week.protein),
			unit: "g",
			sub: `goal ${goals.proteinTarget}`,
		},
		steps: {
			label: "Steps",
			value: fmt(week.steps),
			sub: (
				<Delta
					current={week.steps == null ? null : Math.round(week.steps)}
					previous={lastWeek.steps == null ? null : Math.round(lastWeek.steps)}
				/>
			),
		},
	};

	return (
		<div className="weekly-page ios-swipe" {...swipe}>
			<PeriodNav
				title={weekRange(days[0], days[6])}
				sub={
					(offset === 0 ? "This week · " : "") +
					`${week.workouts} ${week.workouts === 1 ? "workout" : "workouts"}` +
					` · ${lastWeek.workouts} last week`
				}
				prevLabel="Previous week"
				nextLabel="Next week"
				onPrev={() => goWeek(-1)}
				onNext={() => goWeek(1)}
				nextDisabled={offset >= 0}
			/>

			<div className="ios-tiles" role="group" aria-label="Chart">
				{Object.entries(metrics).map(([key, m]) => (
					<StatTile
						key={key}
						label={m.label}
						value={m.value}
						unit={m.unit}
						sub={m.sub}
						selected={chartShow === key}
						onSelect={() => setChartShow(key)}
					/>
				))}
			</div>

			<div
				className="history-charts"
				data-testid="weekly-charts"
				data-show={chartShow}
			>
				{chartShow === "weight" ? (
					<WeightTrendChart
						title="Weight per day"
						data={rows.map((r) => ({
							label: DOW[new Date(`${r.date}T12:00:00`).getDay()],
							value: r.weight == null ? null : Number(toDisplay(r.weight)),
						}))}
						unit={unit}
					/>
				) : (
					<DailyBarChart
						title={`${metrics[chartShow].label} per day`}
						data={chartData(chartShow)}
						goal={
							chartShow === "calories"
								? goals.calorieTargetTraining
								: chartShow === "protein"
									? goals.proteinTarget
									: stepsGoal
						}
						color={CHART_COLORS[chartShow]}
						unit={
							chartShow === "protein"
								? "g"
								: chartShow === "steps"
									? "steps"
									: "kcal"
						}
					/>
				)}
			</div>

			<ul className="week-strip" aria-label="Days of the week">
				{rows.map((row) => (
					<li key={row.date}>
						<DayCard
							row={row}
							today={today}
							selected={row.date === selectedDate}
							onSelect={setSelected}
							toDisplay={toDisplay}
							calorieGoal={calorieGoal}
							proteinGoal={goals.proteinTarget}
							stepsGoal={stepsGoal}
						/>
					</li>
				))}
			</ul>

			<section className="history-day-panel" aria-label="Selected day">
				<div className="ios-section-header">
					<span>{shortDate(selectedDate)}</span>
					{selectedDate === today && <span>Today</span>}
				</div>
				<div className="history-day-panel-body">
					<DayDetail
						key={selectedDate}
						date={selectedDate}
						weightEntry={selectedRow?.weightEntry}
						nutritionEntry={selectedRow?.nutritionEntry}
						nutritionData={nutritionData}
						workoutEntry={selectedRow?.workoutEntry}
						stepEntry={selectedRow?.stepEntry}
						onRefetchW={refetchWeight}
						onRefetchN={refetchNutrition}
						onRefetchWo={refetchWorkouts}
						onRefetchS={refetchSteps}
					/>
				</div>
			</section>
		</div>
	);
}
