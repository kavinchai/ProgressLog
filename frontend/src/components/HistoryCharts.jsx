import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ResponsiveContainer,
} from "recharts";

// Charts shared by the History pages (Weekly / Total).

const axisTick = { fontSize: 11, fill: "var(--muted)" };
const fmt = (v) => (v == null ? "--" : Math.round(v).toLocaleString());

function ChartCard({ title, subtitle, children }) {
	return (
		<section className="history-chart-card" aria-label={title}>
			<div className="history-chart-head">
				<span className="history-chart-title">{title}</span>
				{subtitle && <span className="muted">{subtitle}</span>}
			</div>
			{children}
		</section>
	);
}

// Bars per day (or per week) with an optional dashed goal line.
// data: [{ label, value }] — value null = nothing logged.
export function DailyBarChart({ title, subtitle, data, goal, color, unit }) {
	return (
		<ChartCard title={title} subtitle={subtitle}>
			<ResponsiveContainer width="100%" height={200}>
				<BarChart
					data={data}
					margin={{ top: 16, right: 8, left: -12, bottom: 0 }}
				>
					<CartesianGrid stroke="var(--border-dim)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={axisTick}
						tickLine={false}
						axisLine={false}
					/>
					<YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
					<Tooltip
						cursor={{ fill: "var(--hover-bg)" }}
						formatter={(v) => [`${fmt(v)} ${unit}`, title]}
						contentStyle={{
							background: "var(--bg-card)",
							border: "1px solid var(--border)",
							borderRadius: 8,
							fontSize: 12,
						}}
					/>
					{goal != null && (
						<ReferenceLine
							y={goal}
							stroke="var(--muted)"
							strokeDasharray="4 4"
							label={{
								value: `goal ${fmt(goal)}`,
								position: "insideTopRight",
								fontSize: 10,
								fill: "var(--muted)",
							}}
						/>
					)}
					<Bar
						dataKey="value"
						fill={color}
						radius={[6, 6, 2, 2]}
						maxBarSize={44}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}

// Daily weight as a line. data: [{ label, value }].
export function WeightTrendChart({ title, data, unit }) {
	return (
		<ChartCard title={title} subtitle={unit}>
			<ResponsiveContainer width="100%" height={200}>
				<LineChart
					data={data}
					margin={{ top: 16, right: 8, left: -12, bottom: 0 }}
				>
					<CartesianGrid stroke="var(--border-dim)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={axisTick}
						tickLine={false}
						axisLine={false}
						minTickGap={24}
					/>
					<YAxis
						tick={axisTick}
						tickLine={false}
						axisLine={false}
						width={48}
						domain={["dataMin - 1", "dataMax + 1"]}
					/>
					<Tooltip
						formatter={(v) => [`${v} ${unit}`, "Weight"]}
						contentStyle={{
							background: "var(--bg-card)",
							border: "1px solid var(--border)",
							borderRadius: 8,
							fontSize: 12,
						}}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke="var(--accent)"
						strokeWidth={2.5}
						dot={false}
						connectNulls
					/>
				</LineChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}

// One square per day (columns = weeks), shaded by number of workouts.
// days: [{ date, count }] ascending, starting on a Sunday.
const GRID_MONTHS = [
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
// Rows run Sun → Sat; label every other row like a contribution graph.
const GRID_WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function WorkoutGrid({ title, days }) {
	const total = days.filter((d) => d.count > 0).length;
	// `days` starts on a Sunday, so every 7 days is one column (week). Name the
	// month above the first column of each new month.
	const weekStarts = days.filter((_, i) => i % 7 === 0).map((d) => d.date);
	const monthLabels = weekStarts.map((date, i) => {
		const month = date.slice(0, 7);
		return i === 0 || month !== weekStarts[i - 1].slice(0, 7)
			? GRID_MONTHS[Number(date.slice(5, 7)) - 1]
			: "";
	});
	return (
		<ChartCard title={title} subtitle={`${total} workout days`}>
			<div className="history-grid-wrap">
				<div className="history-grid-frame">
					<div
						className="history-grid-months"
						data-testid="grid-months"
						aria-hidden="true"
					>
						{monthLabels.map((label, i) => (
							<span key={weekStarts[i]}>{label}</span>
						))}
					</div>
					<div
						className="history-grid-weekdays"
						data-testid="grid-weekdays"
						aria-hidden="true"
					>
						{GRID_WEEKDAYS.map((label, i) => (
							<span key={i}>{label}</span>
						))}
					</div>
					<ul className="history-grid" aria-label="Workout days">
						{days.map((d) => (
							<li
								key={d.date}
								aria-label={`${d.date}: ${d.count} workout${d.count === 1 ? "" : "s"}`}
								className={
									"history-grid-cell" +
									(d.count >= 2 ? " lvl-2" : d.count === 1 ? " lvl-1" : "")
								}
							/>
						))}
					</ul>
				</div>
			</div>
			<div className="history-legend">
				<span className="history-legend-note">
					Each column is one week (Sun–Sat)
				</span>
				<span>none</span>
				<i className="history-grid-cell" />
				<i className="history-grid-cell lvl-1" />
				<i className="history-grid-cell lvl-2" />
				<span>2+ sessions</span>
			</div>
		</ChartCard>
	);
}
