import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import useNutrition from '../hooks/useNutrition';
import useUserProfile from '../hooks/useUserProfile';
import { formatDate } from '../utils/date';
import './Nutrition.css';

const BarTooltip = ({ active, payload, label, unit }) => {
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
      <p style={{ color: 'var(--color-info)', fontWeight: 600 }}>
        {payload[0].value} {unit}
      </p>
    </div>
  );
};

export default function Nutrition() {
  const { data, loading, error } = useNutrition();
  const { goals } = useUserProfile();

  const CALORIE_TARGET_TRAINING = goals.calorieTargetTraining;
  const CALORIE_TARGET_REST     = goals.calorieTargetRest;
  const PROTEIN_TARGET          = goals.proteinTarget;

  if (loading) return <div className="loading-state">Loading nutrition data…</div>;
  if (error)   return <div className="error-state">Error: {error}</div>;

  const calData  = data.map((n) => ({
    date:     formatDate(n.logDate),
    calories: n.calories,
    dayType:  n.dayType,
    target:   n.dayType === 'training' ? CALORIE_TARGET_TRAINING : CALORIE_TARGET_REST,
  }));

  const protData = data.map((n) => ({
    date:    formatDate(n.logDate),
    protein: n.proteinGrams,
    dayType: n.dayType,
  }));

  const avgCals    = data.length ? Math.round(data.reduce((s, n) => s + n.calories, 0) / data.length) : 0;
  const avgProtein = data.length ? Math.round(data.reduce((s, n) => s + n.proteinGrams, 0) / data.length) : 0;
  const trainingDays = data.filter((n) => n.dayType === 'training').length;
  const restDays     = data.filter((n) => n.dayType === 'rest').length;

  return (
    <div>
      <div className="nutrition-header">
        <h1>Nutrition</h1>
        <p>Calories &amp; protein tracking against daily targets</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="nutrition-summary-row">
        <div className="nutrition-summary-card">
          <div className="nutrition-summary-label">Avg Calories</div>
          <div className="nutrition-summary-value">{avgCals}</div>
          <div className="nutrition-summary-sub">kcal / day</div>
        </div>
        <div className="nutrition-summary-card">
          <div className="nutrition-summary-label">Avg Protein</div>
          <div className="nutrition-summary-value">{avgProtein}</div>
          <div className="nutrition-summary-sub">g / day</div>
        </div>
        <div className="nutrition-summary-card">
          <div className="nutrition-summary-label">Training Days</div>
          <div className="nutrition-summary-value">{trainingDays}</div>
          <div className="nutrition-summary-sub">target {CALORIE_TARGET_TRAINING} kcal</div>
        </div>
        <div className="nutrition-summary-card">
          <div className="nutrition-summary-label">Rest Days</div>
          <div className="nutrition-summary-value">{restDays}</div>
          <div className="nutrition-summary-sub">target {CALORIE_TARGET_REST} kcal</div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="nutrition-charts">
        {/* Calories chart */}
        <div className="nutrition-chart-card">
          <div className="nutrition-chart-title">Daily Calories</div>
          <div className="nutrition-chart-subtitle">Training target {CALORIE_TARGET_TRAINING} kcal · Rest target {CALORIE_TARGET_REST} kcal</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={calData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={(p) => <BarTooltip {...p} unit="kcal" />} />
              <ReferenceLine y={CALORIE_TARGET_TRAINING} stroke="var(--color-warning)" strokeDasharray="4 2"
                label={{ value: 'Train', fill: 'var(--color-warning)', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={CALORIE_TARGET_REST} stroke="var(--color-info)" strokeDasharray="4 2"
                label={{ value: 'Rest', fill: 'var(--color-info)', fontSize: 10, position: 'right' }} />
              <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                {calData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.dayType === 'training' ? 'var(--color-primary)' : 'var(--color-info)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Protein chart */}
        <div className="nutrition-chart-card">
          <div className="nutrition-chart-title">Daily Protein</div>
          <div className="nutrition-chart-subtitle">Target {PROTEIN_TARGET} g</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={protData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={(p) => <BarTooltip {...p} unit="g" />} />
              <ReferenceLine y={PROTEIN_TARGET} stroke="var(--color-success)" strokeDasharray="4 2"
                label={{ value: `${PROTEIN_TARGET}g`, fill: 'var(--color-success)', fontSize: 10, position: 'right' }} />
              <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
                {protData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.protein >= PROTEIN_TARGET ? 'var(--color-success)' : 'var(--color-warning)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Daily log table ── */}
      <div className="nutrition-log-card">
        <div className="nutrition-log-title">Daily Log</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Calories</th>
              <th>Protein</th>
              <th>Day Type</th>
              <th>Steps</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((n) => (
              <tr key={n.id ?? n.logDate}>
                <td>{n.logDate}</td>
                <td>{n.calories} kcal</td>
                <td>
                  <span style={{ color: n.proteinGrams >= PROTEIN_TARGET ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {n.proteinGrams} g
                  </span>
                </td>
                <td>
                  <span className={`badge ${n.dayType === 'training' ? 'badge-primary' : 'badge-info'}`}>
                    {n.dayType}
                  </span>
                </td>
                <td>{n.steps ? n.steps.toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
