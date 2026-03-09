import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../api';
import './Strength.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

const CHART_COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-gold)',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)', padding: '8px 12px',
      fontSize: 'var(--font-size-sm)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke, fontWeight: 600 }}>
          {p.name}: {p.value} lbs
        </p>
      ))}
    </div>
  );
};

export default function Strength() {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get('/progress/strength')
      .then((r) => setProgressData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading strength data…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  // Build per-exercise chart data: [{date, [exerciseName]: maxWeight}, ...]
  // Group all sessions by date across exercises for a combined view
  const allDates = [...new Set(
    progressData.flatMap((e) => e.data.map((d) => d.sessionDate))
  )].sort();

  const combinedChart = allDates.map((date) => {
    const row = { date: formatDate(date) };
    progressData.forEach((ex) => {
      const session = ex.data.find((d) => d.sessionDate === date);
      if (session) row[ex.exerciseName] = session.maxWeightLbs;
    });
    return row;
  });

  return (
    <div>
      <div className="strength-header">
        <h1>Strength Progress</h1>
        <p>Progressive overload tracking across key compound lifts</p>
      </div>

      {/* ── Combined chart ── */}
      {combinedChart.length > 0 && (
        <div className="strength-chart-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="strength-chart-header">
            <div>
              <div className="strength-chart-title">All Lifts — Weight Over Time</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={combinedChart} margin={{ top: 4, right: 24, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', paddingTop: 12 }}
              />
              {progressData.map((ex, i) => (
                <Line
                  key={ex.exerciseName}
                  type="monotone"
                  dataKey={ex.exerciseName}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Per-lift detail ── */}
      <div className="strength-sets-card">
        <div className="strength-sets-title">Per-Lift Progression Detail</div>
        {progressData.map((exercise) => {
          const first = exercise.data[0];
          const last  = exercise.data[exercise.data.length - 1];
          const delta = last && first ? (last.maxWeightLbs - first.maxWeightLbs) : 0;

          return (
            <div key={exercise.exerciseName} className="lift-section">
              <div className="lift-section-header">
                <span className="lift-name">{exercise.exerciseName}</span>
                <span className="lift-progress-badge">
                  {delta >= 0 ? '+' : ''}{delta} lbs total
                </span>
              </div>
              <div className="sets-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Max Weight</th>
                      <th>Sets</th>
                      <th>Rep Scheme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.data.map((session) => (
                      <tr key={session.sessionDate}>
                        <td>{session.sessionDate}</td>
                        <td>
                          <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                            {session.maxWeightLbs} lbs
                          </span>
                        </td>
                        <td>{session.setCount}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                          {session.repScheme}
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
