import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import api from '../api';
import featuredConfig from '../config/featuredExercises.json';
import SharedCalendar from './SharedCalendar';
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

  const authenticated = useAuthStore((s) => s.authenticated);

  const [view,                 setView]                 = useState('leaderboard');
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
        const allStrength = (d?.exercises ?? []).filter((e) => e.type === 'strength');
        const featured = featuredConfig.strength ?? [];
        let firstStrength = allStrength[0]?.exerciseName ?? null;
        if (featured.length) {
          const nameSet = new Set(featured.map((n) => n.toLowerCase()));
          const match = allStrength.find((e) => nameSet.has(e.exerciseName.toLowerCase()));
          if (match) firstStrength = match.exerciseName;
        }
        if (firstStrength) setSelectedStrength(firstStrength);
        const cardioList = (d?.exercises ?? []).filter((e) => e.type === 'cardio');
        if (cardioList.length) setSelectedCardio(cardioList[0].exerciseName);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message ?? 'Could not load leaderboard.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const strengthExercises = useMemo(() => {
    const all = (data?.exercises ?? []).filter((e) => e.type === 'strength');
    const featured = featuredConfig.strength ?? [];
    if (!featured.length) return all;
    const nameSet = new Set(featured.map((n) => n.toLowerCase()));
    const filtered = all.filter((e) => nameSet.has(e.exerciseName.toLowerCase()));
    return featured
      .map((name) => filtered.find((e) => e.exerciseName.toLowerCase() === name.toLowerCase()))
      .filter(Boolean);
  }, [data]);
  const cardioExercises = useMemo(
    () => (data?.exercises ?? []).filter((e) => e.type === 'cardio'),
    [data],
  );

  const currentExercise = useMemo(() => {
    const list = exerciseTab === 'cardio' ? cardioExercises : strengthExercises;
    const sel  = exerciseTab === 'cardio' ? selectedCardio  : selectedStrength;
    return list.find((e) => e.exerciseName === sel) ?? list[0] ?? null;
  }, [exerciseTab, strengthExercises, cardioExercises, selectedStrength, selectedCardio]);

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
      {!authenticated && (
        <header className="lb-topbar">
          <span className="lb-brand">ProgressLog</span>
          <div className="lb-auth-actions">
            <Link to="/login" className="lb-btn lb-btn-ghost">Sign In</Link>
            <Link to="/login?mode=signup" className="lb-btn lb-btn-primary">Create Account</Link>
          </div>
        </header>
      )}

      <section className="lb-hero">
        <h1>{view === 'calendar' ? 'Community Calendar' : 'Community Leaderboard'}</h1>
        <p>
          {view === 'calendar'
            ? 'Workouts from lifters who opted into the community calendar.'
            : 'Live rankings powered by lifters who chose to share their data. Compete on volume, climb the per-exercise boards, and see what the community is hitting this month.'}
        </p>
      </section>

      <nav className="lb-subnav">
        <button
          type="button"
          className={'lb-subnav-btn' + (view === 'leaderboard' ? ' lb-subnav-btn-active' : '')}
          onClick={() => setView('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          type="button"
          className={'lb-subnav-btn' + (view === 'calendar' ? ' lb-subnav-btn-active' : '')}
          onClick={() => setView('calendar')}
        >
          Shared Calendar
        </button>
      </nav>

      {view === 'calendar' && <SharedCalendar />}

      {view === 'leaderboard' && loading && <div className="lb-loading">Loading leaderboard…</div>}
      {view === 'leaderboard' && error   && <div className="lb-empty">{error}</div>}

      {view === 'leaderboard' && !loading && !error && data && data.totalUsers === 0 && (
        <div className="lb-empty">
          No one has opted in to sharing yet. Sign in and toggle <b>Share Data</b> in Settings to get on the board.
        </div>
      )}

      {view === 'leaderboard' && !loading && !error && data && data.totalUsers > 0 && (
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

              {data.topLifters.length > 0 ? (
                <div className="lb-podium">
                  {data.topLifters.map((u) => {
                    const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;
                    return (
                      <div key={u.username} className={`lb-podium-card lb-podium-rank-${Math.min(u.rank, 4)}`}>
                        <span className="lb-podium-medal">{medal}</span>
                        <span className="lb-podium-user">{u.username}</span>
                        <span className="lb-podium-value">{Math.round(u.totalVolumeLbs).toLocaleString()} lbs</span>
                        <span className="lb-podium-date">{u.totalSets} sets · {u.sessionCount} sessions</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="lb-empty">No volume data yet.</div>
              )}
            </div>

            {/* Community activity — Sessions */}
            <div className="lb-card">
              <div className="lb-card-head">
                <h2 className="lb-card-title">Sessions</h2>
                <span className="lb-card-sub">Last 30 days</span>
              </div>

              {activityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
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
                    <Line type="monotone" dataKey="sessions" name="Sessions"
                          stroke="var(--accent)" strokeWidth={1.8}
                          dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="lb-empty">No session data yet.</div>
              )}
            </div>

            {/* Community activity — Sets */}
            <div className="lb-card">
              <div className="lb-card-head">
                <h2 className="lb-card-title">Sets</h2>
                <span className="lb-card-sub">Last 30 days</span>
              </div>

              {activityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
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
                    <Line type="monotone" dataKey="sets" name="Sets"
                          stroke="var(--success)" strokeWidth={1.8}
                          dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="lb-empty">No set data yet.</div>
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

  const primaryLabel = (e) => {
    switch (metric) {
      case 'weight':   return `${Number(e.bestWeight ?? 0)} lbs × ${e.bestReps ?? 0} reps`;
      case 'time':     return formatDuration(e.totalDurationSeconds);
      case 'distance': return `${Number(e.totalDistance ?? 0).toFixed(2)} mi`;
      case 'count':    return `${e.bestReps}`;
      case 'pace':     return formatPaceSeconds(paceSecondsPerMile(e));
      default:         return '';
    }
  };

  const secondaryLabel = (e) => {
    if (metric === 'weight')   return formatDate(e.achievedDate);
    if (metric === 'time')     return e.totalDistance != null ? `${Number(e.totalDistance).toFixed(2)} mi` : '';
    if (metric === 'distance') return formatDuration(e.totalDurationSeconds);
    if (metric === 'pace')     return e.totalDistance != null ? `${Number(e.totalDistance).toFixed(2)} mi total` : '';
    return formatDate(e.achievedDate);
  };

  if (!exercise.entries.length) {
    return <div className="lb-empty">No entries yet for this category.</div>;
  }

  const medalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="lb-podium">
      {exercise.entries.map((e) => (
        <div key={`${e.rank}-${e.username}`} className={`lb-podium-card lb-podium-rank-${Math.min(e.rank, 4)}`}>
          <span className="lb-podium-medal">{medalEmoji(e.rank)}</span>
          <span className="lb-podium-user">{e.username}</span>
          <span className="lb-podium-value">{primaryLabel(e)}</span>
          <span className="lb-podium-date">{secondaryLabel(e)}</span>
        </div>
      ))}
    </div>
  );
}

function formatPaceSeconds(secPerMile) {
  if (!secPerMile || secPerMile <= 0) return '—';
  const total = Math.round(Number(secPerMile));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/mi`;
}
