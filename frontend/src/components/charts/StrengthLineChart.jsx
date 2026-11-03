import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

// Lives in its own file so recharts is only downloaded when a chart is shown.
export default function StrengthLineChart({
	chartData,
	minVal,
	maxVal,
	pad,
	unit,
}) {
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
