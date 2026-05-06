import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import { formatDate, localDateStr } from '../utils/date';
import { formatDuration, calcPace } from '../utils/workout';
import './Cardio.css';

// ── constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { key: '4W',  label: '4W',  days: 28  },
  { key: '3M',  label: '3M',  days: 90  },
  { key: '6M',  label: '6M',  days: 180 },
  { key: 'ALL', label: 'All', days: null },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function paceSeconds(distanceMiles, durationSeconds) {
  if (!distanceMiles || distanceMiles <= 0 || !durationSeconds) return null;
  return Math.round(durationSeconds / distanceMiles);
}

function fmtPace(sec) {
  if (sec == null) return '--';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function weekStartStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay()); // Sunday of that week
  return localDateStr(d);
}

function todayMinusDays(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return localDateStr(d);
}

function filterByRange(sessions, days) {
  if (days == null) return sessions;
  const cutoff = todayMinusDays(days);
  return sessions.filter((s) => s.sessionDate >= cutoff);
}

function weeklyVolume(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const wk = weekStartStr(s.sessionDate);
    const cur = map.get(wk) ?? { week: wk, miles: 0, durationSec: 0, sessions: 0 };
    cur.miles       += Number(s.totalDistanceMiles)  || 0;
    cur.durationSec += Number(s.totalDurationSeconds) || 0;
    cur.sessions    += 1;
    map.set(wk, cur);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

function hasDistance(sessions) {
  return sessions.some((s) => Number(s.totalDistanceMiles) > 0);
}

function computeStats(sessions, isRun) {
  if (!sessions.length) return null;
  if (isRun) {
    const paces = sessions
      .map((s) => paceSeconds(s.totalDistanceMiles, s.totalDurationSeconds))
      .filter((p) => p != null);
    const bestPace    = paces.length ? Math.min(...paces) : null;
    const longestDist = Math.max(...sessions.map((s) => Number(s.totalDistanceMiles) || 0));
    const totalMiles  = sessions.reduce((sum, s) => sum + (Number(s.totalDistanceMiles) || 0), 0);
    const weeks       = weeklyVolume(sessions);
    const bestWeek    = weeks.length ? Math.max(...weeks.map((w) => w.miles)) : 0;
    return { isRun: true, bestPace, longestDist, totalMiles, bestWeek };
  }
  const longestDur = Math.max(...sessions.map((s) => Number(s.totalDurationSeconds) || 0));
  const totalDur   = sessions.reduce((sum, s) => sum + (Number(s.totalDurationSeconds) || 0), 0);
  return { isRun: false, longestDur, totalDur, sessionCount: sessions.length };
}

// ── charts ───────────────────────────────────────────────────────────────────

function VolumeBarChart({ data, isRun }) {
  if (!data.length) return null;
  const chartData = data.map((d) => ({
    week:  formatDate(d.week),
    value: isRun ? Math.round(d.miles * 10) / 10 : Math.round(d.durationSec / 60),
  }));
  const unit = isRun ? 'mi' : 'min';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={{ stroke: 'var(--border-dim)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip-label">Week of {label}</div>
              <div className="chart-tooltip-value">{payload[0].value} {unit}</div>
            </div>
          ) : null
        } />
        <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PaceTrendChart({ sessions, prPaceSec }) {
  const chartData = sessions
    .map((s) => {
      const pace = paceSeconds(s.totalDistanceMiles, s.totalDurationSeconds);
      return { label: formatDate(s.sessionDate), pace, isPR: pace != null && pace === prPaceSec };
    })
    .filter((d) => d.pace != null)
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!chartData.length) return null;
  const vals   = chartData.map((d) => d.pace);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const pad    = (maxVal - minVal) * 0.15 || 30;

  return (
    <ResponsiveContainer width="100%" height={220}>
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
          reversed
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtPace(v)}
          width={48}
        />
        <Tooltip content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip-label">{label}</div>
              <div className="chart-tooltip-value">
                {fmtPace(payload[0].value)} /mi
                {payload[0].payload.isPR && <span className="chart-pr-tag"> PR</span>}
              </div>
            </div>
          ) : null
        } />
        <Line
          type="linear"
          dataKey="pace"
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

function DurationTrendChart({ sessions }) {
  const chartData = sessions
    .map((s) => ({
      label:    formatDate(s.sessionDate),
      minutes:  Math.round((Number(s.totalDurationSeconds) || 0) / 60),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (!chartData.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={{ stroke: 'var(--border-dim)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip-label">{label}</div>
              <div className="chart-tooltip-value">{payload[0].value} min</div>
            </div>
          ) : null
        } />
        <Line type="linear" dataKey="minutes" stroke="var(--accent)" strokeWidth={2}
          dot={{ r: 3, fill: 'var(--accent)' }}
          activeDot={{ r: 5, fill: 'var(--accent)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, accent, testId }) {
  return (
    <div className="cardio-stat" data-testid={testId}>
      <span className="cardio-stat-label">{label}</span>
      <span className={'cardio-stat-value' + (accent ? ' cardio-stat-value-accent' : '')}>
        {value}
      </span>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Cardio() {
  const [progressData, setProgressData] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeName,   setActiveName]   = useState(null);
  const [rangeKey,     setRangeKey]     = useState('ALL');

  useEffect(() => {
    api.get('/progress/cardio')
      .then((res) => {
        const sorted = [...res.data].sort((a, b) => b.data.length - a.data.length);
        setProgressData(sorted);
        if (sorted.length > 0) setActiveName(sorted[0].exerciseName);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeExercise = useMemo(
    () => progressData.find((e) => e.exerciseName === activeName) ?? null,
    [progressData, activeName],
  );

  const rangeDays = (RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[3]).days;

  const filteredSessions = useMemo(
    () => (activeExercise ? filterByRange(activeExercise.data, rangeDays) : []),
    [activeExercise, rangeDays],
  );

  const isRun  = useMemo(() => (activeExercise ? hasDistance(activeExercise.data) : false), [activeExercise]);
  const stats  = useMemo(() => computeStats(filteredSessions, isRun), [filteredSessions, isRun]);
  const weekly = useMemo(() => weeklyVolume(filteredSessions), [filteredSessions]);
  const prPaceSec = stats?.isRun ? stats.bestPace : null;

  if (loading) return <div className="loading-state">Loading cardio data…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  if (!progressData.length) {
    return (
      <div className="cardio-page">
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

  const sidebarItems = progressData.map((e) => {
    const isRunItem = hasDistance(e.data);
    const total = e.data.reduce((sum, s) => sum + (Number(s.totalDistanceMiles) || 0), 0);
    return {
      name: e.exerciseName,
      meta: isRunItem
        ? `${total.toFixed(1)} mi`
        : `${e.data.length} ${e.data.length === 1 ? 'session' : 'sessions'}`,
    };
  });

  const sortedSessions = [...filteredSessions].sort(
    (a, b) => b.sessionDate.localeCompare(a.sessionDate),
  );

  return (
    <div className="cardio-page">
      <div className="cardio-header">
        <h1>Cardio Progress</h1>
        <p>Track your running distance, pace, and endurance over time</p>
      </div>

      <div className="cardio-layout">
        {/* ── Sidebar list ── */}
        <aside className="cardio-sidebar" data-testid="cardio-sidebar">
          <div className="cardio-sidebar-header">
            <span className="cardio-sidebar-title">Exercises</span>
            <span className="cardio-sidebar-count">{progressData.length}</span>
          </div>
          <ul className="cardio-sidebar-list">
            {sidebarItems.map((item) => {
              const isActive = item.name === activeName;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-label={item.name}
                    aria-pressed={isActive}
                    className={'cardio-sidebar-item' + (isActive ? ' cardio-sidebar-item-active' : '')}
                    onClick={() => setActiveName(item.name)}
                  >
                    <span className="cardio-sidebar-item-name">{item.name}</span>
                    <span className="cardio-sidebar-item-meta" aria-hidden="true">{item.meta}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ── Detail panel ── */}
        <div className="cardio-detail">
          {/* Time range selector */}
          <div className="cardio-range-row">
            <span className="cardio-range-label">Range</span>
            <div className="cardio-range-buttons" role="group" aria-label="Time range">
              {RANGE_OPTIONS.map((r) => {
                const isActive = r.key === rangeKey;
                return (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={isActive}
                    className={'cardio-range-btn' + (isActive ? ' cardio-range-btn-active' : '')}
                    onClick={() => setRangeKey(r.key)}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="section-box cardio-stats-box">
              <div className="cardio-stats-grid">
                {stats.isRun ? (
                  <>
                    <Stat
                      label="best pace"
                      value={stats.bestPace != null ? `${fmtPace(stats.bestPace)} /mi` : '--'}
                      accent
                      testId="stat-best-pace"
                    />
                    <Stat
                      label="longest run"
                      value={`${stats.longestDist.toFixed(2)} mi`}
                      testId="stat-longest-run"
                    />
                    <Stat
                      label="best week"
                      value={`${stats.bestWeek.toFixed(1)} mi`}
                      testId="stat-best-week"
                    />
                    <Stat
                      label="total miles"
                      value={`${stats.totalMiles.toFixed(1)} mi`}
                      testId="stat-total-miles"
                    />
                  </>
                ) : (
                  <>
                    <Stat
                      label="longest"
                      value={formatDuration(stats.longestDur)}
                      accent
                      testId="stat-longest"
                    />
                    <Stat
                      label="total time"
                      value={formatDuration(stats.totalDur)}
                      testId="stat-total-time"
                    />
                    <Stat
                      label="sessions"
                      value={stats.sessionCount}
                      testId="stat-sessions"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* No-data note for active range */}
          {filteredSessions.length === 0 ? (
            <div className="section-box">
              <div className="section-body cardio-no-data">
                <p>No sessions in selected range.</p>
                <p className="cardio-empty-hint">Try a longer range like 6M or All.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Weekly volume bar chart */}
              <div className="section-box">
                <div className="section-header">
                  <span className="section-title">{isRun ? 'Weekly Volume' : 'Weekly Time'}</span>
                  <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                    {weekly.length} {weekly.length === 1 ? 'week' : 'weeks'}
                  </span>
                </div>
                <div className="section-body">
                  <VolumeBarChart data={weekly} isRun={isRun} />
                </div>
              </div>

              {/* Trend line chart */}
              <div className="section-box">
                <div className="section-header">
                  <span className="section-title">{isRun ? 'Pace Trend' : 'Duration Trend'}</span>
                  {isRun && (
                    <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>PR highlighted</span>
                  )}
                </div>
                <div className="section-body">
                  {isRun
                    ? <PaceTrendChart sessions={filteredSessions} prPaceSec={prPaceSec} />
                    : <DurationTrendChart sessions={filteredSessions} />}
                </div>
              </div>
            </>
          )}

          {/* Session log */}
          {sortedSessions.length > 0 && (
            <div className="section-box">
              <div className="section-header">
                <span className="section-title">Session Log</span>
                <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {sortedSessions.length} {sortedSessions.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <ul className="cardio-session-list">
                {sortedSessions.map((s) => {
                  const dist = Number(s.totalDistanceMiles) || 0;
                  const dur  = Number(s.totalDurationSeconds) || 0;
                  const sec  = paceSeconds(dist, dur);
                  const isPR = isRun && sec != null && sec === prPaceSec;
                  return (
                    <li
                      key={s.sessionDate}
                      className={'cardio-session' + (isPR ? ' cardio-session-pr' : '')}
                    >
                      <span className="cardio-session-date">{s.sessionDate}</span>
                      <span className="cardio-session-distance">
                        {isRun && dist > 0 ? `${dist.toFixed(2)} mi` : ''}
                      </span>
                      <span className="cardio-session-duration">{formatDuration(dur)}</span>
                      <span className="cardio-session-pace">
                        {isRun ? (calcPace(dist, dur) ?? '--') : ''}
                        {isPR && <span className="cardio-pr-tag">PR</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
