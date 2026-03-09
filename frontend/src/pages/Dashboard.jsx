import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import './Dashboard.css';

// Phase config
const PHASE1_START_DATE   = '2026-02-25';
const PHASE1_END_DATE     = '2026-04-21';
const PHASE1_START_WEIGHT = 149.0;
const PHASE1_TARGET       = 153.5;
const PHASE2_TARGET       = 149.5;
const PHASE2_END_DATE     = '2026-05-20';

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function phaseProgress(currentWeight) {
  const pct = ((currentWeight - PHASE1_START_WEIGHT) / (PHASE1_TARGET - PHASE1_START_WEIGHT)) * 100;
  return Math.min(100, Math.max(0, pct));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)',
      padding: '8px 12px',
      fontSize: 'var(--font-size-sm)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
        {payload[0].value} lbs
      </p>
    </div>
  );
};

export default function Dashboard() {
  const { data: weightData, loading: wLoading } = useWeightLog();
  const { data: nutritionData }                 = useNutrition();
  const { data: workoutData }                   = useWorkouts();

  const latestWeight = weightData.at(-1);
  const todayNutrition = nutritionData.at(-1);
  const todayWorkout   = workoutData.at(-1);

  const chartData = weightData.map((w) => ({
    date:   formatDate(w.logDate),
    weight: parseFloat(w.weightLbs),
  }));

  const phase1Pct  = latestWeight ? phaseProgress(parseFloat(latestWeight.weightLbs)) : 0;
  const daysLeft1  = daysBetween(new Date().toISOString().slice(0, 10), PHASE1_END_DATE);
  const daysLeft2  = daysBetween(new Date().toISOString().slice(0, 10), PHASE2_END_DATE);

  const currentWeight = latestWeight ? parseFloat(latestWeight.weightLbs) : 0;
  const prevWeight    = weightData.length > 1 ? parseFloat(weightData.at(-2).weightLbs) : currentWeight;
  const weightDelta   = (currentWeight - prevWeight).toFixed(1);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Overview</h1>
        <p>Tracking your lean bulk to cut transformation — deadline May 20, 2026</p>
      </div>

      {/* ── Stats row ── */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-label">Current Weight</span>
          {wLoading ? (
            <span className="stat-value">—</span>
          ) : (
            <>
              <span className="stat-value">{currentWeight || '—'}</span>
              <span className="stat-sub">
                lbs &nbsp;
                <span className={`stat-delta ${parseFloat(weightDelta) > 0 ? 'up' : 'down'}`}>
                  {parseFloat(weightDelta) > 0 ? '▲' : '▼'} {Math.abs(weightDelta)} vs prev
                </span>
              </span>
            </>
          )}
        </div>

        <div className="stat-card">
          <span className="stat-label">Today Calories</span>
          <span className="stat-value">{todayNutrition?.calories ?? '—'}</span>
          <span className="stat-sub">kcal · {todayNutrition?.dayType ?? '—'}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Today Protein</span>
          <span className="stat-value">{todayNutrition?.proteinGrams ?? '—'}</span>
          <span className="stat-sub">g · target 180 g</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Last Session</span>
          <span className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>
            {todayWorkout?.sessionName ?? '—'}
          </span>
          <span className="stat-sub">{todayWorkout?.completionPct ?? '—'}% complete</span>
        </div>
      </div>

      {/* ── Chart + Today card ── */}
      <div className="dashboard-grid">
        <div className="weight-chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Weight Trend</div>
              <div className="chart-subtitle">Last 13 days · lbs</div>
            </div>
            <span className="badge badge-primary">Phase 1</span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={153.5} stroke="var(--color-warning)" strokeDasharray="4 2"
                label={{ value: 'P1 target', fill: 'var(--color-warning)', fontSize: 10, position: 'right' }} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--color-primary)', r: 3 }}
                activeDot={{ r: 5, fill: 'var(--color-primary-light)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today summary */}
        <div className="today-card">
          <div className="chart-title">Today's Summary</div>
          <div className="today-row">
            <span className="today-row-label">Weight</span>
            <span className="today-row-value">{currentWeight || '—'} lbs</span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Calories</span>
            <span className="today-row-value">{todayNutrition?.calories ?? '—'} kcal</span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Protein</span>
            <span className="today-row-value">{todayNutrition?.proteinGrams ?? '—'} g</span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Steps</span>
            <span className="today-row-value">
              {todayNutrition?.steps ? todayNutrition.steps.toLocaleString() : '—'}
            </span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Day Type</span>
            <span className="today-row-value" style={{ textTransform: 'capitalize' }}>
              {todayNutrition?.dayType ?? '—'}
            </span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Workout</span>
            <span className="today-row-value">{todayWorkout?.sessionName ?? '—'}</span>
          </div>
          <div className="today-row">
            <span className="today-row-label">Completion</span>
            <span className="today-row-value">{todayWorkout?.completionPct ?? '—'}%</span>
          </div>
        </div>
      </div>

      {/* ── Phase progress ── */}
      <div className="phase-section">
        <div className="card-title">Transformation Phases</div>
        <div className="phase-list">
          {/* Phase 1 */}
          <div className="phase-item">
            <div className="phase-item-header">
              <span className="phase-item-name">Phase 1 — Lean Bulk</span>
              <span className="phase-item-dates">Feb 25 → Apr 21, 2026</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${phase1Pct.toFixed(1)}%`,
                  background: 'var(--color-primary)',
                }}
              />
            </div>
            <div className="phase-item-meta">
              <span className="phase-item-progress-label">
                {currentWeight || '—'} lbs → {PHASE1_TARGET} lbs target · {daysLeft1} days left
              </span>
              <span className="phase-item-progress-pct">{phase1Pct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="phase-item">
            <div className="phase-item-header">
              <span className="phase-item-name">Phase 2 — Moderate Cut</span>
              <span className="phase-item-dates">Apr 21 → May 20, 2026</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: '0%', background: 'var(--color-info)' }}
              />
            </div>
            <div className="phase-item-meta">
              <span className="phase-item-progress-label">
                {PHASE1_TARGET} lbs → {PHASE2_TARGET} lbs target · {daysLeft2} days total
              </span>
              <span className="phase-item-progress-pct">0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
