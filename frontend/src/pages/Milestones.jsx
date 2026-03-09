import { useState, useEffect } from 'react';
import api from '../api';
import './Milestones.css';

const TYPE_STYLES = {
  achievement: { bg: 'var(--color-success)',  badge: 'badge-success' },
  setback:     { bg: 'var(--color-danger)',   badge: 'badge-danger'  },
  milestone:   { bg: 'var(--color-gold)',     badge: 'badge-warning' },
  note:        { bg: 'var(--color-info)',     badge: 'badge-info'    },
};

export default function Milestones() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get('/progress/milestones')
      .then((r) => setEvents(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading milestones…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  const achievements = events.filter((e) => e.type === 'achievement');
  const setbacks     = events.filter((e) => e.type === 'setback');

  return (
    <div>
      <div className="milestones-header">
        <h1>Milestones</h1>
        <p>Achievements and setbacks throughout your transformation</p>
      </div>

      <div className="milestones-counts">
        <div className="milestones-count-card">
          <div className="milestones-count-value" style={{ color: 'var(--color-success)' }}>
            {achievements.length}
          </div>
          <div className="milestones-count-label">Achievements</div>
        </div>
        <div className="milestones-count-card">
          <div className="milestones-count-value" style={{ color: 'var(--color-danger)' }}>
            {setbacks.length}
          </div>
          <div className="milestones-count-label">Setbacks</div>
        </div>
        <div className="milestones-count-card">
          <div className="milestones-count-value" style={{ color: 'var(--color-info)' }}>
            {events.length}
          </div>
          <div className="milestones-count-label">Total Events</div>
        </div>
      </div>

      <div className="timeline">
        <div className="timeline-title">Event Timeline</div>
        <div className="timeline-list">
          {[...events].reverse().map((event) => {
            const style = TYPE_STYLES[event.type] ?? TYPE_STYLES.note;
            return (
              <div className="timeline-item" key={event.id ?? event.eventDate + event.title}>
                <div
                  className="timeline-dot"
                  style={{ background: style.bg }}
                >
                  {event.type === 'achievement' ? '★' :
                   event.type === 'setback'     ? '▼' :
                   event.type === 'milestone'   ? '◆' : '●'}
                </div>
                <div className="timeline-content">
                  <div className="timeline-content-header">
                    <div>
                      <span className="timeline-event-title">{event.title}</span>
                      <span
                        className={`badge ${style.badge}`}
                        style={{ marginLeft: 8 }}
                      >
                        {event.type}
                      </span>
                    </div>
                    <span className="timeline-date">{event.eventDate}</span>
                  </div>
                  <p className="timeline-description">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
