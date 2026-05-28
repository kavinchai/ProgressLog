import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { getCurrentWeek, localDateStr } from '../utils/date';
import { groupByExercise, detectType, formatDuration, calcPace } from '../utils/workout';
import './TotalStats.css';
import './SharedCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function groupEntriesByDate(entries) {
  const map = new Map();
  for (const e of entries ?? []) {
    if (!map.has(e.sessionDate)) map.set(e.sessionDate, []);
    map.get(e.sessionDate).push(e);
  }
  return map;
}

function monthCells(year, monthIdx0) {
  const firstDow = new Date(year, monthIdx0, 1).getDay();
  const numDays = new Date(year, monthIdx0 + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) {
    cells.push(localDateStr(new Date(year, monthIdx0, d)));
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

function ExerciseBlock({ group }) {
  const type = detectType(group.sets);
  const body =
    type === 'run'
      ? group.sets.map((s) => {
          const dist = s.distanceMiles != null ? `${Number(s.distanceMiles).toFixed(2)} mi` : '--';
          const dur  = formatDuration(s.durationSeconds);
          const pace = calcPace(s.distanceMiles, s.durationSeconds);
          return pace ? `${dist} / ${dur} (${pace})` : `${dist} / ${dur}`;
        }).join('  ')
      : type === 'timed'
        ? group.sets.map((s) => formatDuration(s.durationSeconds)).join('  ')
        : group.sets.map((s) => (s.reps ?? '--')).join('  ');

  return (
    <div className="sc-exercise">
      <div className="sc-exercise-head">
        <span className="sc-exercise-name">{group.name}</span>
        {type === 'lifting' && group.weight != null && (
          <span className="sc-exercise-weight">{group.weight} lbs</span>
        )}
      </div>
      <div className="sc-exercise-reps">{body}</div>
    </div>
  );
}

/**
 * Merge a day's worth of entries into one per user. Multiple sessions for the
 * same user on the same day flatten into a single sets[] so groupByExercise can
 * consolidate matching (exercise, weight) pairs across sessions.
 */
function mergeByUser(entries) {
  const order = [];
  const byUser = new Map();
  for (const e of entries) {
    if (!byUser.has(e.username)) {
      byUser.set(e.username, []);
      order.push(e.username);
    }
    for (const s of e.sets ?? []) byUser.get(e.username).push(s);
  }
  return order.map((username) => ({ username, sets: byUser.get(username) }));
}

function DayCell({ date, entries, isToday }) {
  const merged = mergeByUser(entries);
  return (
    <div
      data-testid={`shared-day-${date}`}
      className={'calendar-cell sc-day-cell' + (isToday ? ' calendar-cell-today' : '')}
    >
      <div className="calendar-cell-date">{parseInt(date.slice(8), 10)}</div>
      <div className="sc-day-entries">
        {merged.map((m) => {
          const groups = groupByExercise(m.sets);
          return (
            <div key={m.username} className="sc-day-entry">
              <span className="sc-day-user">{m.username}</span>
              <div className="sc-exercise-list">
                {groups.map((g) => (
                  <ExerciseBlock key={`${g.name}-${g.weight}`} group={g} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SharedCalendar() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState('week');

  useEffect(() => {
    let cancelled = false;
    api.get('/shared-calendar')
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message ?? 'Could not load shared calendar.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const entriesByDate = useMemo(
    () => groupEntriesByDate(data?.entries),
    [data],
  );

  if (loading) return <div className="sc-loading">Loading shared calendar…</div>;
  if (error)   return <div className="sc-error">{error}</div>;
  if (!data || data.totalUsers === 0) {
    return (
      <div className="sc-empty">
        No one has opted in to the community calendar yet.
        Turn on <b>Share on Community Calendar</b> in Settings to add your workouts.
      </div>
    );
  }

  const today = localDateStr(new Date());
  const week  = getCurrentWeek();
  const now   = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const cells = view === 'week' ? week : monthCells(now.getFullYear(), now.getMonth());

  return (
    <div className="sc-wrap">
      <div className="sc-stats">
        {data.totalUsers.toLocaleString()} {data.totalUsers === 1 ? 'lifter' : 'lifters'} sharing ·
        {' '}{data.entries.length} {data.entries.length === 1 ? 'workout' : 'workouts'}
      </div>

      <div className="sc-view-tabs-row">
        <nav className="page-tabs sc-view-tabs" aria-label="Calendar view">
          <button
            type="button"
            className={'page-tab' + (view === 'week' ? ' page-tab-active' : '')}
            onClick={() => setView('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={'page-tab' + (view === 'month' ? ' page-tab-active' : '')}
            onClick={() => setView('month')}
          >
            Month
          </button>
        </nav>
      </div>

      <div className="sc-range-label">
        {view === 'week' ? 'this week' : monthLabel}
      </div>

      <div className="calendar-wrap">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((date, i) => (
            date === null
              ? <div key={`pad-${i}`} className="calendar-cell calendar-cell-pad" />
              : (
                <DayCell
                  key={date}
                  date={date}
                  entries={entriesByDate.get(date) ?? []}
                  isToday={date === today}
                />
              )
          ))}
        </div>
      </div>
    </div>
  );
}
