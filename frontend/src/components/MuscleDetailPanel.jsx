import './MuscleDetailPanel.css';

export default function MuscleDetailPanel({ muscle, exercises }) {
  if (!muscle) return null;

  return (
    <div className="muscle-detail-panel">
      <div className="muscle-detail-header">
        <span className="muscle-detail-title">{muscle}</span>
        <span className="muscle-detail-count">
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="muscle-detail-body">
        {exercises.length === 0 ? (
          <p className="muscle-detail-empty">No exercises targeted this muscle group this week.</p>
        ) : (
          <div className="muscle-exercise-list">
            {exercises.map((ex, i) => (
              <div key={`${ex.name}-${i}`} className="muscle-exercise-item">
                <span className="muscle-exercise-name">{ex.name}</span>
                <div className="muscle-exercise-sets">
                  {ex.sets.map((s, j) => (
                    <span key={j} className="muscle-set-detail">
                      {s.weightLbs != null && `${s.weightLbs} lbs`}
                      {s.reps != null && ` \u00d7 ${s.reps}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
