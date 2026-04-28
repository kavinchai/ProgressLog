import { useState, useEffect } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import api from "../api";
import { formatDate } from "../utils/date";
import { formatDuration, calcPace } from "../utils/workout";
import { CHART_COLORS } from "../utils/constants";
import "./Cardio.css";

/** Compute pace in seconds-per-mile (for charting). */
function paceSeconds(distanceMiles, durationSeconds) {
	if (!distanceMiles || distanceMiles <= 0 || !durationSeconds) return null;
	return Math.round(durationSeconds / distanceMiles);
}

/** Format pace seconds as "M:SS". */
function fmtPace(sec) {
	if (sec == null) return "--";
	const m = Math.floor(sec / 60);
	const s = Math.round(sec % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}

function PaceChart({ data, color }) {
	const chartData = data
		.map((d) => ({
			date: formatDate(d.sessionDate),
			pace: paceSeconds(d.totalDistanceMiles, d.totalDurationSeconds),
		}))
		.filter((d) => d.pace != null);

	if (chartData.length < 2) return null;

	const vals = chartData.map((d) => d.pace);
	const minVal = Math.min(...vals);
	const maxVal = Math.max(...vals);
	const pad = (maxVal - minVal) * 0.15 || 30;

	return (
		<ResponsiveContainer width="100%" height={180}>
			<LineChart
				data={chartData}
				margin={{ top: 8, right: 16, bottom: 0, left: -8 }}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--border-color)"
					vertical={false}
				/>
				<XAxis
					dataKey="date"
					tick={{ fill: "var(--text-muted)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					domain={[minVal - pad, maxVal + pad]}
					reversed
					tick={{ fill: "var(--text-muted)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => fmtPace(v)}
				/>
				<Tooltip
					content={({ active, payload, label }) =>
						active && payload?.length ? (
							<div className="cardio-tooltip">
								<div style={{ color: "var(--text-muted)" }}>{label}</div>
								<div style={{ color, fontWeight: 600 }}>
									{fmtPace(payload[0].value)} /mi
								</div>
							</div>
						) : null
					}
				/>
				<Line
					type="monotone"
					dataKey="pace"
					stroke={color}
					strokeWidth={2}
					dot={{ r: 3 }}
					connectNulls
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

function DistanceChart({ data, color }) {
	const chartData = data.map((d) => ({
		date: formatDate(d.sessionDate),
		distance: d.totalDistanceMiles,
	}));

	if (chartData.length < 2) return null;

	const vals = chartData.map((d) => d.distance);
	const minVal = Math.min(...vals);
	const maxVal = Math.max(...vals);
	const pad = (maxVal - minVal) * 0.15 || 0.5;

	return (
		<ResponsiveContainer width="100%" height={180}>
			<LineChart
				data={chartData}
				margin={{ top: 8, right: 16, bottom: 0, left: -8 }}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--border-color)"
					vertical={false}
				/>
				<XAxis
					dataKey="date"
					tick={{ fill: "var(--text-muted)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					domain={[Math.max(0, minVal - pad), maxVal + pad]}
					tick={{ fill: "var(--text-muted)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => v.toFixed(1) + " mi"}
				/>
				<Tooltip
					content={({ active, payload, label }) =>
						active && payload?.length ? (
							<div className="cardio-tooltip">
								<div style={{ color: "var(--text-muted)" }}>{label}</div>
								<div style={{ color, fontWeight: 600 }}>
									{payload[0].value.toFixed(2)} mi
								</div>
							</div>
						) : null
					}
				/>
				<Line
					type="monotone"
					dataKey="distance"
					stroke={color}
					strokeWidth={2}
					dot={{ r: 3 }}
					connectNulls
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

export default function Cardio() {
	const [progressData, setProgressData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedExercise, setExpandedExercise] = useState(null);

	useEffect(() => {
		api
			.get("/progress/cardio")
			.then((res) => setProgressData(res.data))
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div className="loading-state">Loading cardio data…</div>;
	if (error) return <div className="error-state">Error: {error}</div>;

	if (progressData.length === 0) {
		return (
			<div>
				<div className="cardio-header">
					<h1>Cardio Progress</h1>
					<p>Track your running distance, pace, and endurance over time</p>
				</div>
				<div className="cardio-empty">
					<p>No cardio sessions logged yet.</p>
					<p className="cardio-empty-hint">
						Log a run from the Today page to start tracking your progress.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="cardio-header">
				<h1>Cardio Progress</h1>
				<p>Track your running distance, pace, and endurance over time</p>
			</div>

			{/* ── Summary cards ── */}
			<div className="cardio-summary">
				{progressData.map((exercise, i) => {
					const totalDist = exercise.data.reduce(
						(sum, d) => sum + d.totalDistanceMiles,
						0,
					);
					const totalTime = exercise.data.reduce(
						(sum, d) => sum + d.totalDurationSeconds,
						0,
					);
					const avgPaceSec =
						totalDist > 0 ? Math.round(totalTime / totalDist) : null;
					const color = CHART_COLORS[i % CHART_COLORS.length];

					return (
						<div
							key={exercise.exerciseName}
							className="cardio-stat-card"
							style={{ borderTopColor: color }}
						>
							<div className="cardio-stat-label">{exercise.exerciseName}</div>
							<div className="cardio-stat-grid">
								<div className="cardio-stat-item">
									<span className="cardio-stat-value">
										{totalDist.toFixed(1)}
									</span>
									<span className="cardio-stat-unit">mi total</span>
								</div>
								<div className="cardio-stat-item">
									<span className="cardio-stat-value">
										{exercise.data.length}
									</span>
									<span className="cardio-stat-unit">sessions</span>
								</div>
								<div className="cardio-stat-item">
									<span className="cardio-stat-value">
										{avgPaceSec ? fmtPace(avgPaceSec) : "--"}
									</span>
									<span className="cardio-stat-unit">avg pace /mi</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* ── Per-exercise detail ── */}
			<div className="cardio-detail-card">
				<div className="cardio-detail-title">Session History</div>
				{progressData.map((exercise, i) => {
					const color = CHART_COLORS[i % CHART_COLORS.length];
					const expanded = expandedExercise === exercise.exerciseName;

					// Best pace (lowest seconds/mi)
					const paces = exercise.data
						.map((d) =>
							paceSeconds(d.totalDistanceMiles, d.totalDurationSeconds),
						)
						.filter((p) => p != null);
					const bestPace = paces.length ? Math.min(...paces) : null;

					// Longest run
					const longestDist = Math.max(
						...exercise.data.map((d) => d.totalDistanceMiles),
					);

					return (
						<div key={exercise.exerciseName} className="cardio-section">
							<div
								className="cardio-section-header"
								onClick={() =>
									setExpandedExercise(expanded ? null : exercise.exerciseName)
								}
							>
								<span className="cardio-section-name">
									{exercise.exerciseName}
								</span>
								<span className="cardio-section-badges">
									{bestPace != null && (
										<span className="cardio-badge cardio-badge-pace">
											{fmtPace(bestPace)} /mi best
										</span>
									)}
									<span className="cardio-badge cardio-badge-dist">
										{longestDist.toFixed(1)} mi longest
									</span>
									<span className="cardio-chevron">{expanded ? "▲" : "▼"}</span>
								</span>
							</div>

							{expanded && (
								<div className="cardio-charts">
									<div className="cardio-chart-group">
										<div className="cardio-chart-label">Pace Trend</div>
										<PaceChart data={exercise.data} color={color} />
									</div>
									<div className="cardio-chart-group">
										<div className="cardio-chart-label">Distance Trend</div>
										<DistanceChart data={exercise.data} color={color} />
									</div>
								</div>
							)}

							<div className="cardio-table-wrapper">
								<table className="cardio-table">
									<thead>
										<tr>
											<th>Date</th>
											<th>Distance</th>
											<th>Duration</th>
											<th>Pace</th>
										</tr>
									</thead>
									<tbody>
										{[...exercise.data]
											.sort((a, b) =>
												b.sessionDate.localeCompare(a.sessionDate),
											)
											.map((session) => (
												<tr key={session.sessionDate}>
													<td>{session.sessionDate}</td>
													<td className="cardio-cell-distance">
														{session.totalDistanceMiles.toFixed(2)} mi
													</td>
													<td>
														{formatDuration(session.totalDurationSeconds)}
													</td>
													<td className="cardio-cell-pace">
														{calcPace(
															session.totalDistanceMiles,
															session.totalDurationSeconds,
														) ?? "--"}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
