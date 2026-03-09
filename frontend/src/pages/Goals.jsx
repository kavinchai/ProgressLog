import useWeightLog from '../hooks/useWeightLog';
import './Goals.css';

const GOALS = {
  deadline:       'May 20, 2026',
  targetWeightLow:  149.5,
  targetWeightHigh: 150.0,
  targetBFLow:     11,
  targetBFHigh:    13,
};

const ADHERENCE = [
  { label: 'Calorie compliance',    requirement: '≥ 80% of days within 150 kcal of target' },
  { label: 'Protein target',        requirement: '≥ 180 g / day on training days' },
  { label: 'Training frequency',    requirement: '4–5 sessions / week' },
  { label: 'Phase 1 weight gain',   requirement: '0.5–1.0 lb / week (lean bulk)' },
  { label: 'Phase 2 weight loss',   requirement: '1.0–1.5 lbs / week (cut)' },
  { label: 'Steps',                 requirement: '8,000+ steps / day' },
];

const PHASES = [
  {
    label:      'Phase 1',
    name:       'Lean Bulk',
    start:      'Feb 25, 2026',
    end:        'Apr 21, 2026',
    startWeight: 149.0,
    endTarget:   153.5,
    ratePerWeek: '+0.5–1.0 lb',
    calories:    '2,400–2,700 kcal (training)',
    color:       'var(--color-primary)',
  },
  {
    label:      'Phase 2',
    name:       'Moderate Cut',
    start:      'Apr 21, 2026',
    end:        'May 20, 2026',
    startWeight: 153.5,
    endTarget:   149.5,
    ratePerWeek: '−1.0–1.5 lbs',
    calories:    '2,000–2,200 kcal',
    color:       'var(--color-info)',
  },
];

export default function Goals() {
  const { data: weightData } = useWeightLog();

  const currentWeight  = weightData.length ? parseFloat(weightData.at(-1).weightLbs) : null;
  const startWeight    = 149.0;
  const p1Progress     = currentWeight
    ? ((currentWeight - startWeight) / (153.5 - startWeight) * 100).toFixed(0)
    : 0;

  const daysToDeadline = Math.round(
    (new Date('2026-05-20') - new Date()) / 86400000
  );

  return (
    <div>
      <div className="goals-header">
        <h1>Goals</h1>
        <p>
          Deadline <strong style={{ color: 'var(--text-primary)' }}>{GOALS.deadline}</strong>
          {' '}— {daysToDeadline} days remaining
        </p>
      </div>

      <div className="goals-grid">
        {/* Target metrics */}
        <div className="goals-card">
          <div className="goals-card-title">Target Metrics</div>
          <div className="goal-target-list">
            <div className="goal-target-item">
              <div className="goal-target-header">
                <span className="goal-target-name">Target Weight</span>
                <span className="goal-target-value">
                  {GOALS.targetWeightLow}–{GOALS.targetWeightHigh} lbs
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, p1Progress))}%`,
                    background: 'var(--color-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Current: {currentWeight ?? '—'} lbs
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)' }}>
                  Phase 1: {p1Progress}%
                </span>
              </div>
            </div>

            <div className="goal-target-item">
              <div className="goal-target-header">
                <span className="goal-target-name">Body Fat %</span>
                <span className="goal-target-value">
                  {GOALS.targetBFLow}–{GOALS.targetBFHigh}%
                </span>
              </div>
            </div>

            <div className="goal-target-item">
              <div className="goal-target-header">
                <span className="goal-target-name">Deadline</span>
                <span className="goal-target-value">{GOALS.deadline}</span>
              </div>
            </div>

            <div className="goal-target-item">
              <div className="goal-target-header">
                <span className="goal-target-name">Phase 1 End Target</span>
                <span className="goal-target-value">153.5 lbs by Apr 21</span>
              </div>
            </div>

            <div className="goal-target-item">
              <div className="goal-target-header">
                <span className="goal-target-name">Phase 2 End Target</span>
                <span className="goal-target-value">149.5 lbs by May 20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Adherence requirements */}
        <div className="goals-card">
          <div className="goals-card-title">Adherence Requirements</div>
          <div className="adherence-table">
            {ADHERENCE.map((item) => (
              <div className="adherence-row" key={item.label}>
                <span className="adherence-label">{item.label}</span>
                <span className="adherence-requirement">{item.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase breakdown */}
      <div className="projection-card">
        <div className="projection-title">Phase Breakdown & Projections</div>
        <div className="projection-phases">
          {PHASES.map((phase) => (
            <div
              key={phase.label}
              className="phase-card"
              style={{ borderColor: phase.color }}
            >
              <div className="phase-card-label" style={{ color: phase.color }}>
                {phase.label}
              </div>
              <div className="phase-card-name">{phase.name}</div>
              <div className="phase-card-details">
                <span className="phase-card-detail">
                  <strong>Duration:</strong> {phase.start} → {phase.end}
                </span>
                <span className="phase-card-detail">
                  <strong>Weight:</strong> {phase.startWeight} → {phase.endTarget} lbs
                </span>
                <span className="phase-card-detail">
                  <strong>Rate:</strong> {phase.ratePerWeek} / week
                </span>
                <span className="phase-card-detail">
                  <strong>Calories:</strong> {phase.calories}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
