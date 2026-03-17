import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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


function LiftChart({ data, color }) {
  // One point per date using the highest weight that day
  const byDate = {};
  data.forEach(d => {
    const date = formatDate(d.sessionDate);
    if (!byDate[date] || d.maxWeightLbs > byDate[date].weight) byDate[date] = { date, weight: d.maxWeightLbs };
  });
  const chartData = Object.values(byDate);
  const vals   = chartData.map(d => d.weight);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const pad    = (maxVal - minVal) * 0.15 || 5;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[minVal - pad, maxVal + pad]}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v + ' lbs'}
        />
        <Tooltip content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div style={{ color, fontWeight: 600 }}>{payload[0].value} lbs</div>
            </div>
          ) : null
        } />
        <Line type="monotone" dataKey="weight" stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Strength() {
  const [progressData, setProgressData] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [expandedLift, setExpandedLift] = useState(null);

  useEffect(() => {
    api.get('/progress/strength')
      .then((response) => setProgressData(response.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading strength data…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  return (
    <div>
      <div className="strength-header">
        <h1>Strength Progress</h1>
        <p>Progressive overload tracking across key compound lifts</p>
      </div>

      {/* ── Per-lift detail ── */}
      <div className="strength-sets-card">
        <div className="strength-sets-title">Per-Lift Progression Detail</div>
        {progressData.map((exercise, i) => {
          // Delta: max weight on last date vs max weight on first date
          const maxByDate = {};
          exercise.data.forEach(d => {
            if (!maxByDate[d.sessionDate] || d.maxWeightLbs > maxByDate[d.sessionDate])
              maxByDate[d.sessionDate] = d.maxWeightLbs;
          });
          const sortedDates = Object.keys(maxByDate).sort();
          const delta = sortedDates.length >= 2
            ? (maxByDate[sortedDates[sortedDates.length - 1]] - maxByDate[sortedDates[0]])
            : 0;
          const color    = CHART_COLORS[i % CHART_COLORS.length];
          const expanded = expandedLift === exercise.exerciseName;

          return (
            <div key={exercise.exerciseName} className="lift-section">
              <div
                className="lift-section-header"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedLift(expanded ? null : exercise.exerciseName)}
              >
                <span className="lift-name">{exercise.exerciseName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="lift-progress-badge">{delta >= 0 ? '+' : ''}{delta} lbs total</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{expanded ? '▲' : '▼'}</span>
                </span>
              </div>
              {expanded && exercise.data.length > 1 && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <LiftChart data={exercise.data} color={color} />
                </div>
              )}
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
                    {[...exercise.data].sort((a, b) => b.maxWeightLbs - a.maxWeightLbs).map((session) => (
                      <tr key={`${session.sessionDate}-${session.maxWeightLbs}`}>
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
