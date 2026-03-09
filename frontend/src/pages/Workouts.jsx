import useWorkouts from '../hooks/useWorkouts';
import './Workouts.css';

function completionColor(pct) {
  if (pct === 0)   return 'var(--color-danger)';
  if (pct < 50)    return 'var(--color-warning)';
  if (pct < 80)    return 'var(--color-info)';
  return 'var(--color-success)';
}

function completionBadge(pct) {
  if (pct === 0)   return 'badge-danger';
  if (pct < 50)    return 'badge-warning';
  if (pct < 80)    return 'badge-info';
  return 'badge-success';
}

export default function Workouts() {
  const { data, loading, error } = useWorkouts();

  if (loading) return <div className="loading-state">Loading workouts…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  const completed  = data.filter((s) => s.completionPct === 100).length;
  const skipped    = data.filter((s) => s.completionPct === 0).length;
  const partial    = data.filter((s) => s.completionPct > 0 && s.completionPct < 100).length;
  const avgCompletion = data.length
    ? Math.round(data.reduce((s, w) => s + w.completionPct, 0) / data.length)
    : 0;

  return (
    <div>
      <div className="workouts-header">
        <h1>Workouts</h1>
        <p>Session log with completion rates — 12 sessions tracked</p>
      </div>

      {/* ── Summary ── */}
      <div className="workouts-summary-row">
        <div className="workouts-summary-card">
          <div className="workouts-summary-label">Total Sessions</div>
          <div className="workouts-summary-value">{data.length}</div>
          <div className="workouts-summary-sub">tracked</div>
        </div>
        <div className="workouts-summary-card">
          <div className="workouts-summary-label">Full Completion</div>
          <div className="workouts-summary-value" style={{ color: 'var(--color-success)' }}>
            {completed}
          </div>
          <div className="workouts-summary-sub">100% sessions</div>
        </div>
        <div className="workouts-summary-card">
          <div className="workouts-summary-label">Partial</div>
          <div className="workouts-summary-value" style={{ color: 'var(--color-warning)' }}>
            {partial}
          </div>
          <div className="workouts-summary-sub">1–99%</div>
        </div>
        <div className="workouts-summary-card">
          <div className="workouts-summary-label">Avg Completion</div>
          <div className="workouts-summary-value">{avgCompletion}%</div>
          <div className="workouts-summary-sub">{skipped} skipped</div>
        </div>
      </div>

      {/* ── Session log ── */}
      <div className="workouts-log-card">
        <div className="workouts-log-title">Session History</div>

        <div className="session-row" style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Date</span>
          <span>Session</span>
          <span style={{ textAlign: 'right' }}>Pct</span>
          <span>Progress</span>
        </div>

        {[...data].reverse().map((session) => (
          <div className="session-row" key={session.id ?? session.sessionDate}>
            <span className="session-date">{session.sessionDate}</span>
            <span className="session-name">
              {session.sessionName}
              {session.completionPct === 0 && (
                <span className="badge badge-danger" style={{ marginLeft: 8 }}>Skipped</span>
              )}
            </span>
            <span
              className="session-pct-label"
              style={{ color: completionColor(session.completionPct) }}
            >
              {session.completionPct}%
            </span>
            <div className="session-progress-wrap">
              <div className="session-progress-bar">
                <div
                  className="session-progress-fill"
                  style={{
                    width: `${session.completionPct}%`,
                    background: completionColor(session.completionPct),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
