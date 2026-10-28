import { useState } from "react";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import useWeightUnit from "../hooks/useWeightUnit";
import DayDetail from "../components/DayDetail";
import { DailyBarChart } from "../components/HistoryCharts";
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

const monthDay = (iso) => {
	const [, m, d] = iso.split("-");
	return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`;
};
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

function Kpi({ label, value, children }) {
	return (
		<div className="history-kpi" role="group" aria-label={label}>
			<span className="history-kpi-label">{label}</span>
			<span className="history-kpi-value">{value}</span>
			<span className="history-kpi-sub">{children}</span>
		</div>
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
		{ key: "steps", label: "steps", value: row.steps, goal: STEPS_GOAL },
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
	const { unit, toDisplay } = useWeightUnit();

	const [offset, setOffset] = useState(0);
	const [selected, setSelected] = useState(null);

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

	return (
		<div className="weekly-page">
			<div className="history-head">
				<span className="history-title">Week of {monthDay(days[0])}</span>
				{offset === 0 && <span className="history-pill">This week</span>}
				<span className="history-spacer" />
				<div className="history-nav">
					<button
						type="button"
						aria-label="Previous week"
						onClick={() => goWeek(-1)}
					>
						‹
					</button>
					<span className="history-nav-label">
						{monthDay(days[0])} – {monthDay(days[6])}
					</span>
					<button
						type="button"
						aria-label="Next week"
						disabled={offset >= 0}
						onClick={() => goWeek(1)}
					>
						›
					</button>
				</div>
			</div>

			<div className="history-kpis">
				<Kpi
					label="Avg weight"
					value={week.weight == null ? "--" : `${toDisplay(week.weight)}`}
				>
					{unit} ·{" "}
					<Delta
						current={
							week.weight == null ? null : Number(toDisplay(week.weight))
						}
						previous={
							lastWeek.weight == null
								? null
								: Number(toDisplay(lastWeek.weight))
						}
					/>
				</Kpi>
				<Kpi label="Avg calories" value={fmt(week.calories)}>
					target {fmt(goals.calorieTargetTraining)}
				</Kpi>
				<Kpi
					label="Avg protein"
					value={week.protein == null ? "--" : `${fmt(week.protein)}g`}
				>
					target {goals.proteinTarget}g
				</Kpi>
				<Kpi label="Avg steps" value={fmt(week.steps)}>
					<Delta current={week.steps} previous={lastWeek.steps} />
				</Kpi>
				<Kpi label="Workouts" value={`${week.workouts} / 7`}>
					{lastWeek.workouts} last week
				</Kpi>
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
						/>
					</li>
				))}
			</ul>

			<section className="history-day-panel" aria-label="Selected day">
				<div className="history-day-panel-head">
					<span className="history-day-panel-title">
						{shortDate(selectedDate)}
					</span>
					{selectedDate === today && (
						<span className="history-pill">Today</span>
					)}
				</div>
				<div className="history-day-panel-body">
					<DayDetail
						key={selectedDate}
						date={selectedDate}
						weightEntry={selectedRow?.weightEntry}
						nutritionEntry={selectedRow?.nutritionEntry}
						workoutEntry={selectedRow?.workoutEntry}
						stepEntry={selectedRow?.stepEntry}
						onRefetchW={refetchWeight}
						onRefetchN={refetchNutrition}
						onRefetchWo={refetchWorkouts}
						onRefetchS={refetchSteps}
					/>
				</div>
			</section>

			<div className="history-charts">
				<DailyBarChart
					title="Calories per day"
					data={chartData("calories")}
					goal={goals.calorieTargetTraining}
					color="#d4934e"
					unit="kcal"
				/>
				<DailyBarChart
					title="Steps per day"
					data={chartData("steps")}
					goal={STEPS_GOAL}
					color="#8a7ec8"
					unit="steps"
				/>
			</div>
		</div>
	);
}
