import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts";

// Lives in its own file so recharts is only downloaded when a chart is shown.
export default function SessionsBarChart({ data }) {
	return (
		<ResponsiveContainer width="100%" height={140}>
			<BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
				<XAxis
					dataKey="date"
					interval={Math.max(0, Math.floor(data.length / 3))}
					tick={{ fontSize: 11, fill: "var(--muted)" }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis hide allowDecimals={false} />
				<Tooltip cursor={{ fill: "var(--hover-bg)" }} />
				<Bar
					dataKey="sessions"
					name="Sessions"
					fill="var(--accent)"
					radius={[3, 3, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
