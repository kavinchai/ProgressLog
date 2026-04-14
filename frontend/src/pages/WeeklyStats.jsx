import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import DayDetail from '../components/DayDetail';
import { localDateStr, shortDate, avg } from '../utils/date';
import './WeeklyStats.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function getLast7Days() {
  const days = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateStr(d));
  }
  return days;
}

// ── Weight line chart ─────────────────────────────────────────────────────────

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value} lbs</div>
    </div>
  );
}

function WeightLineChart({ days, weights }) {
  const data = days.map((date, i) => ({ label: shortDate(date), weight: weights[i] }));
  const valid = weights.filter(w => w != null);
  if (!valid.length) return null;
  const minVal = Math.min(...valid);
  const maxVal = Math.max(...valid);
  const pad    = (maxVal - minVal) * 0.15 || 2;
  const isMobile = window.innerWidth <= 640;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={isMobile ? false : { fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
          axisLine={{ stroke: 'var(--border-dim)' }}
          tickLine={false}
        />
        <YAxis
          domain={[minVal - pad, maxVal + pad]}
          tickFormatter={v => parseFloat(v).toFixed(2)}
          tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<WeightTooltip />} />
        <Line
          type="linear"
          dataKey="weight"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyStats() {
  const { data: weightData,    refetch: refetchWeight }    = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts }  = useWorkouts();

  const [expandedDay, setExpandedDay] = useState(null);

  const days  = getLast7Days();
  const today = localDateStr(new Date());

  const rows = days.map(date => {
    const weightEntry    = weightData.find(x => x.logDate === date);
    const nutritionEntry = nutritionData.find(x => x.logDate === date);
    const workoutEntry   = workoutData.find(x => x.sessionDate === date);
    return {
      date,
      weightEntry, nutritionEntry, workoutEntry,
      weight:   weightEntry    ? parseFloat(weightEntry.weightLbs)                   : null,
      calories: nutritionEntry ? (nutritionEntry.totalCalories ?? null)               : null,
      protein:  nutritionEntry ? (nutritionEntry.totalProtein  ?? null)               : null,
      workout:  workoutEntry   ? (workoutEntry.sessionName
        ? workoutEntry.sessionName
        : workoutEntry.exerciseSets?.length > 0
          ? new Set(workoutEntry.exerciseSets.map(s => s.exerciseName)).size + ' exercises'
          : 'logged') : null,
    };
  });

  const weights      = rows.map(row => row.weight);
  const workoutCount = rows.filter(row => row.workout).length;
  const avgWeight    = avg(weights);
  const avgCalories  = avg(rows.map(row => row.calories));
  const avgProtein   = avg(rows.map(row => row.protein));

  return (
    <div className="weekly-page">
      <div className="weekly-header">
        <span className="weekly-title">WEEKLY STATS</span>
        <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>last 7 days</span>
      </div>

      {/* Summary */}
      <div className="section-box" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Summary</span>
        </div>
        <div className="section-body">
          <div className="weekly-summary-grid">
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg weight</span>
              <span className="weekly-stat-value">{avgWeight ? avgWeight + ' lbs' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg calories</span>
              <span className="weekly-stat-value">{avgCalories ? avgCalories + ' kcal' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg protein</span>
              <span className="weekly-stat-value">{avgProtein ? avgProtein + ' g' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">workouts</span>
              <span className="weekly-stat-value">{workoutCount} / 7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily log — click a row to expand editing */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Daily Log</span>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>click row to expand</span>
        </div>
        <div className="section-body" style={{ padding: 0 }}>
          <div className="weekly-table-wrap">
            <table className="weekly-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Workout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <>
                    <tr
                      key={row.date}
                      className={'weekly-row' + (row.date === today ? ' today-row' : '') + (expandedDay === row.date ? ' expanded-row' : '')}
                      onClick={() => setExpandedDay(expandedDay === row.date ? null : row.date)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{shortDate(row.date)}</td>
                      <td>{row.weight != null ? row.weight + ' lbs' : '--'}</td>
                      <td>{row.calories != null ? row.calories : '--'}</td>
                      <td>{row.protein != null ? row.protein + 'g' : '--'}</td>
                      <td>{row.workout ?? '--'}</td>
                    </tr>
                    {expandedDay === row.date && (
                      <tr key={row.date + '-detail'} className="detail-row">
                        <td colSpan={5}>
                          <DayDetail
                            date={row.date}
                            weightEntry={row.weightEntry}
                            nutritionEntry={row.nutritionEntry}
                            workoutEntry={row.workoutEntry}
                            onRefetchW={refetchWeight}
                            onRefetchN={refetchNutrition}
                            onRefetchWo={refetchWorkouts}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weight trend */}
      {weights.some(w => w != null) && (
        <div className="section-box">
          <div className="section-header">
            <span className="section-title">Weight Trend</span>
          </div>
          <div className="section-body">
            <WeightLineChart days={[...days].reverse()} weights={[...weights].reverse()} />
          </div>
        </div>
      )}
    </div>
  );
}
