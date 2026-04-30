import { useState } from "react";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import DayDetail from "../components/DayDetail";
import Modal from "../components/Modal";
import WeightLineChart from "../components/WeightLineChart";
import {
	localDateStr,
	formatDateShort as formatDate,
	avg,
} from "../utils/date";
import { buildDayRows } from "../utils/stats";
import useWeightUnit from "../hooks/useWeightUnit";
import "./WeeklyStats.css";
import "./TotalStats.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const RANGE_OPTIONS = ["30d", "90d", "1yr", "all"];
const RANGE_DAYS = { "30d": 30, "90d": 90, "1yr": 365, all: Infinity };

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
function monthLabel(ym) {
	const [y, m] = ym.split("-");
	return MONTH_NAMES[parseInt(m) - 1] + " " + y;
}

export default function TotalStats() {
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const { unit, toDisplay } = useWeightUnit();

	const [selectedDay, setSelectedDay] = useState(null);
	const [rangeKey, setRangeKey] = useState("90d");
	const [logMonth, setLogMonth] = useState(null);
	const [picker, setPicker] = useState(null);

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

	const cutoff =
		RANGE_DAYS[rangeKey] === Infinity
			? null
			: localDateStr(new Date(Date.now() - RANGE_DAYS[rangeKey] * 86400000));
	const weightBarDates = [...allDates]
		.reverse()
		.filter((d) => !cutoff || d >= cutoff);
	const weightBarWeights = weightBarDates.map(
		(d) => rows.find((row) => row.date === d)?.weight ?? null,
	);

	const allMonths = [...new Set(allDates.map((d) => d.slice(0, 7)))].sort();
	const activeMonth = logMonth ?? today.slice(0, 7);
	const monthIdx = allMonths.indexOf(activeMonth);

	const monthRows = (() => {
		if (activeMonth > today.slice(0, 7)) return [];
		const [y, m] = activeMonth.split("-").map(Number);
		const lastOfMonth = localDateStr(new Date(y, m, 0));
		const end = lastOfMonth < today ? lastOfMonth : today;
		const days = [];
		for (
			let d = new Date(`${activeMonth}-01T00:00:00`);
			d <= new Date(`${end}T00:00:00`);
			d.setDate(d.getDate() + 1)
		) {
			days.push(localDateStr(d));
		}
		return days
			.reverse()
			.map((date) => rows.find((row) => row.date === date) ?? emptyRow(date));
	})();

	// Calendar grid: always 6 rows × 7 cols = 42 cells, so the calendar's
	// total height stays constant regardless of which month is active.
	const calendarCells = (() => {
		const [y, m] = activeMonth.split("-").map(Number);
		const firstDow = new Date(y, m - 1, 1).getDay();
		const numDays = new Date(y, m, 0).getDate();
		const cells = [];
		for (let i = 0; i < firstDow; i++) cells.push(null);
		for (let d = 1; d <= numDays; d++) {
			const date = localDateStr(new Date(y, m - 1, d));
			cells.push(rows.find((r) => r.date === date) ?? emptyRow(date));
		}
		while (cells.length < 35) cells.push(null);
		return cells;
	})();
	const avgWeight = avg(monthRows.map((row) => row.weight));
	const avgCalories = avg(monthRows.map((row) => row.calories));
	const avgProtein = avg(monthRows.map((row) => row.protein));
	const avgSteps = avg(monthRows.map((row) => row.steps));
	const totalWorkouts = monthRows.filter((row) => row.workout).length;

	const [activeYear, activeMonthNum] = activeMonth.split("-");
	const allYears = [...new Set(allMonths.map((m) => m.slice(0, 4)))].sort();
	const monthsWithData = new Set(
		allMonths.filter((m) => m.startsWith(activeYear)).map((m) => m.slice(5, 7)),
	);

	function goMonth(ym) {
		setLogMonth(ym);
		setSelectedDay(null);
		setPicker(null);
	}

	const selectedRow =
		selectedDay != null
			? (rows.find((r) => r.date === selectedDay) ?? emptyRow(selectedDay))
			: null;
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

	return (
		<div className="total-page">
			<div className="weekly-header">
				<span className="weekly-title">Total Stats</span>
				<span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
					all time
				</span>
			</div>

			{/* Summary */}
			<div className="section-box" style={{ marginBottom: 12 }}>
				<div className="section-header">
					<span className="section-title">Summary</span>
					<span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
						{monthLabel(activeMonth)}
					</span>
				</div>
				<div className="section-body">
					<div className="weekly-summary-grid">
						<div className="weekly-stat">
							<span className="weekly-stat-label">avg weight</span>
							<span className="weekly-stat-value">
								{avgWeight ? toDisplay(avgWeight) + " " + unit : "--"}
							</span>
						</div>
						<div className="weekly-stat">
							<span className="weekly-stat-label">avg calories</span>
							<span className="weekly-stat-value">
								{avgCalories ? avgCalories + " kcal" : "--"}
							</span>
						</div>
						<div className="weekly-stat">
							<span className="weekly-stat-label">avg protein</span>
							<span className="weekly-stat-value">
								{avgProtein ? avgProtein + " g" : "--"}
							</span>
						</div>
						<div className="weekly-stat">
							<span className="weekly-stat-label">avg steps</span>
							<span className="weekly-stat-value">
								{avgSteps ? avgSteps.toLocaleString() : "--"}
							</span>
						</div>
						<div className="weekly-stat">
							<span className="weekly-stat-label">total workouts</span>
							<span className="weekly-stat-value">{totalWorkouts}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Full log */}
			<div className="section-box">
				<div className="section-header">
					<span className="section-title">Full Log</span>
					<span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
						{rows.length} {rows.length === 1 ? "entry" : "entries"} · click a
						day to view or edit
					</span>
				</div>
				{allMonths.length > 0 && (
					<>
						<div className="month-nav">
							<button
								className="btn btn-sm"
								onClick={() => goMonth(allMonths[monthIdx - 1])}
								disabled={monthIdx <= 0}
							>
								&larr; Prev
							</button>
							<span className="month-nav-label">
								<button
									className={
										"btn btn-sm" + (picker === "month" ? " range-active" : "")
									}
									onClick={() => togglePicker("month")}
								>
									{MONTH_NAMES[parseInt(activeMonthNum) - 1]}
								</button>
								<button
									className={
										"btn btn-sm" + (picker === "year" ? " range-active" : "")
									}
									onClick={() => togglePicker("year")}
								>
									{activeYear}
								</button>
							</span>
							<button
								className="btn btn-sm"
								onClick={() => goMonth(allMonths[monthIdx + 1])}
								disabled={monthIdx >= allMonths.length - 1}
							>
								Next &rarr;
							</button>
						</div>
						{picker === "month" && (
							<div className="month-picker">
								{Array.from({ length: 12 }, (_, i) => {
									const mm = String(i + 1).padStart(2, "0");
									const hasData = monthsWithData.has(mm);
									return (
										<button
											key={mm}
											className={
												"btn btn-sm" +
												(mm === activeMonthNum ? " range-active" : "")
											}
											onClick={() => selectMonth(mm)}
											disabled={!hasData}
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
					</>
				)}
				<div className="section-body" style={{ padding: 0 }}>
					{rows.length === 0 ? (
						<div style={{ padding: "12px 14px" }} className="muted">
							No data logged yet.
						</div>
					) : (
						<div className="calendar-wrap">
							<div className="calendar-weekdays">
								{WEEKDAYS.map((d) => (
									<div key={d} className="calendar-weekday">
										{d}
									</div>
								))}
							</div>
							<div className="calendar-grid">
								{calendarCells.map((row, i) =>
									row === null ? (
										<div
											key={`pad-${i}`}
											className="calendar-cell calendar-cell-pad"
										/>
									) : (
										<button
											key={row.date}
											type="button"
											data-testid={`calendar-day-${row.date}`}
											className={
												"calendar-cell" +
												(row.date === today ? " calendar-cell-today" : "") +
												(row.date > today ? " calendar-cell-future" : "")
											}
											onClick={() =>
												row.date <= today && setSelectedDay(row.date)
											}
											disabled={row.date > today}
										>
											<div className="calendar-cell-date">
												{parseInt(row.date.slice(8))}
											</div>
											<div className="calendar-cell-metrics">
												{row.weight != null && (
													<div className="calendar-metric calendar-metric--weight">
														<span className="calendar-metric-key">Weight</span>
														<span className="calendar-metric-val">
															{toDisplay(row.weight)} {unit}
														</span>
													</div>
												)}
												{row.calories != null && (
													<div className="calendar-metric calendar-metric--calories">
														<span className="calendar-metric-key">Calories</span>
														<span className="calendar-metric-val">
															{row.calories}
														</span>
													</div>
												)}
												{row.protein != null && (
													<div className="calendar-metric calendar-metric--protein">
														<span className="calendar-metric-key">Protein</span>
														<span className="calendar-metric-val">
															{row.protein}g
														</span>
													</div>
												)}
												{row.steps != null && (
													<div className="calendar-metric calendar-metric--steps">
														<span className="calendar-metric-key">Steps</span>
														<span className="calendar-metric-val">
															{row.steps.toLocaleString()}
														</span>
													</div>
												)}
												{row.workout != null && (
													<div className="calendar-metric calendar-metric--workout">
														<span className="calendar-metric-key">Workout</span>
														<span
															className="calendar-metric-val calendar-metric-workout"
															title={row.workout}
														>
															{row.workout}
														</span>
													</div>
												)}
											</div>
											<div className="calendar-cell-dots" aria-hidden="true">
												{row.weight   != null && <span className="cal-dot cal-dot--weight" />}
												{row.calories != null && <span className="cal-dot cal-dot--calories" />}
												{row.protein  != null && <span className="cal-dot cal-dot--protein" />}
												{row.steps    != null && <span className="cal-dot cal-dot--steps" />}
												{row.workout  != null && <span className="cal-dot cal-dot--workout" />}
											</div>
										</button>
									),
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{selectedDay && selectedRow && (
				<Modal
					title={formatDate(selectedDay)}
					onClose={() => setSelectedDay(null)}
				>
					<DayDetail
						date={selectedRow.date}
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
				</Modal>
			)}

			{/* Weight trend */}
			{weightBarWeights.some((w) => w != null) && (
				<div className="section-box">
					<div className="section-header">
						<span className="section-title">Weight Trend</span>
						<div className="range-selector">
							{RANGE_OPTIONS.map((r) => (
								<button
									key={r}
									className={
										"btn btn-sm" + (rangeKey === r ? " range-active" : "")
									}
									onClick={() => setRangeKey(r)}
								>
									{r}
								</button>
							))}
						</div>
					</div>
					<div className="section-body">
						<WeightLineChart
							unit={unit}
							data={weightBarDates.map((date, i) => ({
								label: formatDate(date),
								weight: toDisplay(weightBarWeights[i]),
							}))}
							height={220}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
