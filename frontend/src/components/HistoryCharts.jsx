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
export function WorkoutGrid({ title, days }) {
	const total = days.filter((d) => d.count > 0).length;
	return (
		<ChartCard title={title} subtitle={`${total} workout days`}>
			<div className="history-grid-wrap">
				<div className="history-grid" role="list" aria-label="Workout days">
					{days.map((d) => (
						<span
							key={d.date}
							role="listitem"
							aria-label={`${d.date}: ${d.count} workout${d.count === 1 ? "" : "s"}`}
							className={
								"history-grid-cell" +
								(d.count >= 2 ? " lvl-2" : d.count === 1 ? " lvl-1" : "")
							}
						/>
					))}
				</div>
			</div>
			<div className="history-legend">
				<span>none</span>
				<i className="history-grid-cell" />
				<i className="history-grid-cell lvl-1" />
				<i className="history-grid-cell lvl-2" />
				<span>2+ sessions</span>
			</div>
		</ChartCard>
	);
}
