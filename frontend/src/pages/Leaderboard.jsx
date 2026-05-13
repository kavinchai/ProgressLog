import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../api';
import './Leaderboard.css';

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="lb-tooltip">
      <div className="lb-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value, p.dataKey) : p.value}
        </div>
      ))}
    </div>
  );
}

function rankClass(rank) {
  if (rank === 1) return 'lb-rank lb-rank-1';
  if (rank === 2) return 'lb-rank lb-rank-2';
  if (rank === 3) return 'lb-rank lb-rank-3';
  return 'lb-rank';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function Leaderboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [exerciseTab,          setExerciseTab]          = useState('strength');
  const [selectedStrength,     setSelectedStrength]     = useState(null);
  const [selectedCardio,       setSelectedCardio]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/leaderboard')
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setData(d);
        const strengthList = (d?.exercises ?? []).filter((e) => e.type === 'strength');
        const cardioList   = (d?.exercises ?? []).filter((e) => e.type === 'cardio');
        if (strengthList.length) setSelectedStrength(strengthList[0].exerciseName);
        if (cardioList.length)   setSelectedCardio(cardioList[0].exerciseName);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message ?? 'Could not load leaderboard.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const strengthExercises = useMemo(
    () => (data?.exercises ?? []).filter((e) => e.type === 'strength'),
    [data],
  );
  const cardioExercises = useMemo(
    () => (data?.exercises ?? []).filter((e) => e.type === 'cardio'),
    [data],
  );

  const currentExercise = useMemo(() => {
    const list = exerciseTab === 'cardio' ? cardioExercises : strengthExercises;
    const sel  = exerciseTab === 'cardio' ? selectedCardio  : selectedStrength;
    return list.find((e) => e.exerciseName === sel) ?? list[0] ?? null;
  }, [exerciseTab, strengthExercises, cardioExercises, selectedStrength, selectedCardio]);

  const topLiftersChartData = useMemo(() => {
    if (!data?.topLifters) return [];
    return data.topLifters.map((u) => ({
      name:   u.username,
      volume: Number(u.totalVolumeLbs ?? 0),
    }));
  }, [data]);

  const activityChartData = useMemo(() => {
    if (!data?.activity) return [];
    return data.activity.map((p) => ({
      date:     formatDate(p.date),
      sessions: p.sessionCount,
      sets:     p.setCount,
    }));
  }, [data]);

  function selectExercise(name) {
    if (exerciseTab === 'cardio') setSelectedCardio(name);
    else setSelectedStrength(name);
  }

  const activeList = exerciseTab === 'cardio' ? cardioExercises : strengthExercises;

  return (
    <div className="lb-page">
      <header className="lb-topbar">
        <span className="lb-brand">ProgressLog</span>
        <div className="lb-auth-actions">
          <Link to="/login" className="lb-btn lb-btn-ghost">Sign In</Link>
          <Link to="/login?mode=signup" className="lb-btn lb-btn-primary">Create Account</Link>
        </div>
      </header>

      <section className="lb-hero">
        <h1>Community Leaderboard</h1>
        <p>
          Live rankings powered by lifters who chose to share their data.
          Compete on volume, climb the per-exercise boards, and see what the community is hitting this month.
        </p>
      </section>

      {loading && <div className="lb-loading">Loading leaderboard…</div>}
      {error   && <div className="lb-empty">{error}</div>}

      {!loading && !error && data && data.totalUsers === 0 && (
        <div className="lb-empty">
          No one has opted in to sharing yet. Sign in and toggle <b>Share Data</b> in Settings to get on the board.
        </div>
      )}

      {!loading && !error && data && data.totalUsers > 0 && (
        <>
          <div className="lb-stats">
            <div className="lb-stat">
              <span className="lb-stat-value">{data.totalUsers.toLocaleString()}</span>
              <span className="lb-stat-label">Lifters</span>
            </div>
            <div className="lb-stat">
              <span className="lb-stat-value">{data.totalSessions.toLocaleString()}</span>
              <span className="lb-stat-label">Sessions</span>
            </div>
            <div className="lb-stat">
              <span className="lb-stat-value">{data.totalSets.toLocaleString()}</span>
              <span className="lb-stat-label">Sets</span>
            </div>
          </div>

          <div className="lb-main">
            {/* Per-exercise leaderboard with Strength / Cardio tabs — first, full width */}
            <div className="lb-card lb-card-wide">
              <div className="lb-card-head">
                <h2 className="lb-card-title">Exercise Leaderboard</h2>
                <span className="lb-card-sub">
                  {exerciseTab === 'cardio'
                    ? 'Runs only — longest single-run time and best lifetime average pace'
                    : 'Ranked by best single set (weight → reps)'}
                </span>
              </div>

              {/* Strength / Cardio tab switcher */}
              <div className="lb-ex-tabs">
                <button
                  type="button"
                  className={'lb-ex-tab' + (exerciseTab === 'strength' ? ' lb-ex-tab-active' : '')}
                  onClick={() => setExerciseTab('strength')}
                >
                  Strength
                </button>
                <button
                  type="button"
                  className={'lb-ex-tab' + (exerciseTab === 'cardio' ? ' lb-ex-tab-active' : '')}
                  onClick={() => setExerciseTab('cardio')}
                >
                  Cardio
                </button>
              </div>

              {activeList.length > 0 ? (
                <>
                  <div className="lb-exercise-list">
                    {activeList.map((e) => (
                      <button
                        key={e.exerciseName}
                        type="button"
                        className={'lb-pill' + (e.exerciseName === currentExercise?.exerciseName ? ' active' : '')}
                        onClick={() => selectExercise(e.exerciseName)}
                      >
                        {e.exerciseName}
                      </button>
                    ))}
                  </div>

                  {currentExercise && <ExerciseBoard exercise={currentExercise} />}
                </>
              ) : (
                <div className="lb-empty">
                  No {exerciseTab} exercises logged yet.
                </div>
              )}
            </div>

            {/* Top lifters by volume */}
            <div className="lb-card">
              <div className="lb-card-head">
                <h2 className="lb-card-title">Top Lifters</h2>
                <span className="lb-card-sub">By total volume (weight × reps)</span>
              </div>

              {topLiftersChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topLiftersChartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
                    <XAxis dataKey="name"
                           tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                           axisLine={{ stroke: 'var(--border-dim)' }}
                           tickLine={false} />
                    <YAxis tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                           axisLine={false}
                           tickLine={false}
                           width={56}
                           tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${Math.round(v).toLocaleString()} lbs`} />} />
                    <Bar dataKey="volume" name="Volume" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="lb-empty">No volume data yet.</div>
              )}

              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th className="lb-num">Volume</th>
                    <th className="lb-num lb-hide-sm">Sets</th>
                    <th className="lb-num lb-hide-sm">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLifters.map((u) => (
                    <tr key={u.username}>
                      <td className={rankClass(u.rank)}>{u.rank}</td>
                      <td className="lb-name">{u.username}</td>
                      <td className="lb-num">{Math.round(u.totalVolumeLbs).toLocaleString()} lbs</td>
                      <td className="lb-num lb-hide-sm">{u.totalSets}</td>
                      <td className="lb-num lb-hide-sm">{u.sessionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Community activity */}
            <div className="lb-card">
              <div className="lb-card-head">
                <h2 className="lb-card-title">Community Activity</h2>
                <span className="lb-card-sub">Last 30 days</span>
              </div>

              {activityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={activityChartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
                    <XAxis dataKey="date"
                           interval={Math.max(0, Math.floor(activityChartData.length / 8))}
                           tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                           axisLine={{ stroke: 'var(--border-dim)' }}
                           tickLine={false} />
                    <YAxis tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                           axisLine={false}
                           tickLine={false}
                           width={36} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font)' }} />
                    <Line type="monotone" dataKey="sessions" name="Sessions"
                          stroke="var(--accent)" strokeWidth={1.8}
                          dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="sets" name="Sets"
                          stroke="var(--success)" strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="lb-empty">No activity yet.</div>
              )}
            </div>
          </div>
        </>
      )}

      <footer className="lb-footer">
        Want to be on the board? <Link to="/login?mode=signup">Create an account</Link>,
        log workouts, and opt in to data sharing in your settings.
      </footer>
    </div>
  );
}

function ExerciseBoard({ exercise }) {
  const metric = exercise.metric ?? (exercise.type === 'cardio' ? 'distance' : 'weight');

  const paceSecondsPerMile = (e) => {
    const dist = Number(e.totalDistance ?? 0);
    const dur  = Number(e.totalDurationSeconds ?? 0);
    return dist > 0 ? dur / dist : 0;
  };

  const primaryValue = (e) => {
    switch (metric) {
      case 'weight':   return Number(e.bestWeight ?? 0);
      case 'time':     return Number(e.totalDurationSeconds ?? 0);
      case 'distance': return Number(e.totalDistance ?? 0);
      case 'count':    return Number(e.bestReps ?? 0);
      case 'pace':     return paceSecondsPerMile(e);
      default:         return 0;
    }
  };

  const formatValue = (v) => {
    switch (metric) {
      case 'weight':   return `${v} lbs`;
      case 'time':     return formatDuration(Math.round(v));
      case 'distance': return `${v.toFixed(2)} mi`;
      case 'count':    return `${v}`;
      case 'pace':     return formatPaceSeconds(v);
      default:         return `${v}`;
    }
  };

  const columnLabel = {
    weight:   'Best Set',
    time:     'Time',
    distance: 'Distance',
    count:    'Runs',
    pace:     'Avg Pace',
  }[metric] ?? 'Score';

  const chartData = exercise.entries.map((e) => ({
    name:  e.username,
    value: primaryValue(e),
  }));

  if (!chartData.length) {
    return <div className="lb-empty">No entries yet for this category.</div>;
  }

  // For pace-based categories, lower is better — invert chart bar so larger bars = faster runners.
  // For time-based, longer is the achievement (longest run time), so don't reverse.
  const reverseXAxis = metric === 'pace';

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" horizontal={false} />
          <XAxis type="number" reversed={reverseXAxis}
                 tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                 axisLine={false}
                 tickLine={false}
                 tickFormatter={(v) => formatValue(v)} />
          <YAxis type="category" dataKey="name" width={84}
                 orientation={reverseXAxis ? 'right' : 'left'}
                 tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
                 axisLine={false}
                 tickLine={false} />
          <Tooltip content={<ChartTooltip formatter={formatValue} />} />
          <Bar dataKey="value"
               name={columnLabel}
               fill="var(--accent)"
               radius={reverseXAxis ? [4, 0, 0, 4] : [0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th className="lb-num">{columnLabel}</th>
            {metric === 'weight'   && <th className="lb-num lb-hide-sm">Reps</th>}
            {metric === 'time'     && <th className="lb-num lb-hide-sm">Distance</th>}
            {metric === 'distance' && <th className="lb-num lb-hide-sm">Duration</th>}
            {metric === 'pace'     && <th className="lb-num lb-hide-sm">Total Distance</th>}
            <th className="lb-num lb-hide-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {exercise.entries.map((e) => (
            <tr key={`${e.rank}-${e.username}`}>
              <td className={rankClass(e.rank)}>{e.rank}</td>
              <td className="lb-name">{e.username}</td>
              <td className="lb-num">
                {metric === 'weight'   && `${Number(e.bestWeight ?? 0)} lbs`}
                {metric === 'time'     && formatDuration(e.totalDurationSeconds)}
                {metric === 'distance' && `${Number(e.totalDistance ?? 0).toFixed(2)} mi`}
                {metric === 'count'    && `${e.bestReps}`}
                {metric === 'pace'     && formatPaceSeconds(paceSecondsPerMile(e))}
              </td>
              {metric === 'weight'   && <td className="lb-num lb-hide-sm">{e.bestReps}</td>}
              {metric === 'time'     && <td className="lb-num lb-hide-sm">{e.totalDistance != null ? `${Number(e.totalDistance).toFixed(2)} mi` : '—'}</td>}
              {metric === 'distance' && <td className="lb-num lb-hide-sm">{formatDuration(e.totalDurationSeconds)}</td>}
              {metric === 'pace'     && <td className="lb-num lb-hide-sm">{e.totalDistance != null ? `${Number(e.totalDistance).toFixed(2)} mi` : '—'}</td>}
              <td className="lb-num lb-hide-sm">{formatDate(e.achievedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function formatPaceSeconds(secPerMile) {
  if (!secPerMile || secPerMile <= 0) return '—';
  const total = Math.round(Number(secPerMile));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/mi`;
}
