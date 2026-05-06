import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import useWeightUnit from '../hooks/useWeightUnit';
import { formatDate } from '../utils/date';
import './Strength.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - date.getTime()) / 86400000);
}

function lastTrainedLabel(dateStr) {
  const n = daysSince(dateStr);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

// Roll up sessions to one entry per date (highest weight that day wins).
function rollupByDate(sessions) {
  const byDate = {};
  sessions.forEach(s => {
    const existing = byDate[s.sessionDate];
    if (!existing || s.maxWeightLbs > existing.maxWeightLbs) {
      byDate[s.sessionDate] = s;
    }
  });
  return Object.values(byDate).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

function computeStats(sessions, toDisplay) {
  if (!sessions.length) return null;
  const byDate   = rollupByDate(sessions);
  const first    = byDate[0];
  const last     = byDate[byDate.length - 1];
  const maxLbs   = Math.max(...byDate.map(s => Number(s.maxWeightLbs)));
  const prDate   = byDate.find(s => Number(s.maxWeightLbs) === maxLbs).sessionDate;
  const improvLbs = Number(last.maxWeightLbs) - Number(first.maxWeightLbs);
  return {
    currentMax:   toDisplay(maxLbs),
    sessions:     byDate.length,
    improvement:  Math.round(toDisplay(improvLbs) * 10) / 10,
    lastTrained:  lastTrainedLabel(last.sessionDate),
    prDate,
    prWeightLbs:  maxLbs,
  };
}

// ── chart ─────────────────────────────────────────────────────────────────────

function StrengthChart({ sessions, prWeightLbs, unit, toDisplay }) {
  const byDate = rollupByDate(sessions);
  const chartData = byDate.map(s => ({
    label:    formatDate(s.sessionDate),
    weight:   toDisplay(Number(s.maxWeightLbs)),
    isPR:     Number(s.maxWeightLbs) === prWeightLbs,
  }));
  if (!chartData.length) return null;
  const vals   = chartData.map(d => d.weight);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const pad    = (maxVal - minVal) * 0.15 || 5;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={{ stroke: 'var(--border-dim)' }}
          tickLine={false}
        />
        <YAxis
          domain={[minVal - pad, maxVal + pad]}
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v}
          width={48}
        />
        <Tooltip content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip-label">{label}</div>
              <div className="chart-tooltip-value">
                {payload[0].value} {unit}
                {payload[0].payload.isPR && <span className="chart-pr-tag"> PR</span>}
              </div>
            </div>
          ) : null
        } />
        <Line
          type="linear"
          dataKey="weight"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={({ cx, cy, payload, index }) =>
            payload.isPR ? (
              <circle key={`pr-${index}`} cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={2} />
            ) : (
              <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="var(--accent)" />
            )
          }
          activeDot={{ r: 5, fill: 'var(--accent)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, testId, accent }) {
  return (
    <div className="strength-stat" data-testid={testId}>
      <span className="strength-stat-label">{label}</span>
      <span className={'strength-stat-value' + (accent ? ' strength-stat-value-accent' : '')}>
        {value}
      </span>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Strength() {
  const [progressData, setProgressData] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeName,   setActiveName]   = useState(null);
  const { unit, toDisplay } = useWeightUnit();

  useEffect(() => {
    api.get('/progress/strength')
      .then((res) => {
        setProgressData(res.data);
        if (res.data.length > 0) setActiveName(res.data[0].exerciseName);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const active = useMemo(
    () => progressData.find((e) => e.exerciseName === activeName) ?? null,
    [progressData, activeName],
  );
  const stats = useMemo(
    () => (active ? computeStats(active.data, toDisplay) : null),
    [active, toDisplay],
  );

  if (loading) return <div className="loading-state">Loading strength data…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  if (!progressData.length) {
    return (
      <div className="strength-page">
        <div className="strength-header">
          <h1>Strength Progress</h1>
          <p>Track max weight progression across your lifts</p>
        </div>
        <div className="strength-empty">
          <p>No strength data logged yet.</p>
          <p className="strength-empty-hint">
            Log a workout from the Today page to start tracking your lifts.
          </p>
        </div>
      </div>
    );
  }

  // Sidebar items: name + current max for each exercise
  const sidebarItems = progressData.map((e) => {
    const maxLbs = Math.max(...e.data.map(s => Number(s.maxWeightLbs)));
    return {
      name:    e.exerciseName,
      maxDisp: toDisplay(maxLbs),
    };
  });

  // Sessions sorted by date descending for the table
  const sortedSessions = active
    ? [...active.data].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    : [];

  return (
    <div className="strength-page">
      <div className="strength-header">
        <h1>Strength Progress</h1>
        <p>Track max weight progression across your lifts</p>
      </div>

      <div className="strength-layout">
        {/* Sidebar list */}
        <aside className="strength-sidebar" data-testid="strength-sidebar">
          <div className="strength-sidebar-header">
            <span className="strength-sidebar-title">Exercises</span>
            <span className="strength-sidebar-count">{progressData.length}</span>
          </div>
          <ul className="strength-sidebar-list">
            {sidebarItems.map((item) => {
              const isActive = item.name === activeName;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-label={item.name}
                    aria-pressed={isActive}
                    className={'strength-sidebar-item' + (isActive ? ' strength-sidebar-item-active' : '')}
                    onClick={() => setActiveName(item.name)}
                  >
                    <span className="strength-sidebar-item-name">{item.name}</span>
                    <span className="strength-sidebar-item-meta" aria-hidden="true">
                      {item.maxDisp} {unit}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Detail panel */}
        <div className="strength-detail">
          {/* Stat row */}
          {stats && (
            <div className="section-box strength-stats-box">
              <div className="strength-stats-grid">
                <Stat
                  label="current max"
                  value={`${stats.currentMax} ${unit}`}
                  testId="stat-current-max"
                  accent
                />
                <Stat
                  label="sessions"
                  value={stats.sessions}
                  testId="stat-sessions"
                />
                <Stat
                  label="improvement"
                  value={`${stats.improvement >= 0 ? '+' : ''}${stats.improvement} ${unit}`}
                  testId="stat-improvement"
                />
                <Stat
                  label="last trained"
                  value={stats.lastTrained}
                  testId="stat-last-trained"
                />
              </div>
            </div>
          )}

          {/* Chart */}
          {active && active.data.length > 0 && (
            <div className="section-box">
              <div className="section-header">
                <span className="section-title">Weight Progression</span>
                <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  PR highlighted
                </span>
              </div>
              <div className="section-body">
                <StrengthChart
                  sessions={active.data}
                  prWeightLbs={stats?.prWeightLbs}
                  unit={unit}
                  toDisplay={toDisplay}
                />
              </div>
            </div>
          )}

          {/* Session history */}
          {active && (
            <div className="section-box">
              <div className="section-header">
                <span className="section-title">Session History</span>
                <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {sortedSessions.length} {sortedSessions.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="section-body" style={{ padding: 0 }}>
                <div className="strength-table-wrap">
                  <table className="strength-table" data-testid="session-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Max Weight</th>
                        <th>Sets</th>
                        <th>Rep Scheme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((s) => {
                        const isPR = stats && Number(s.maxWeightLbs) === stats.prWeightLbs
                                     && s.sessionDate === stats.prDate;
                        return (
                          <tr
                            key={`${s.sessionDate}-${s.maxWeightLbs}`}
                            className={isPR ? 'strength-pr-row' : ''}
                          >
                            <td>{s.sessionDate}</td>
                            <td className="strength-cell-weight">
                              {toDisplay(Number(s.maxWeightLbs))} {unit}
                              {isPR && <span className="strength-pr-tag">PR</span>}
                            </td>
                            <td>{s.setCount}</td>
                            <td className="strength-cell-reps">{s.repScheme}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
