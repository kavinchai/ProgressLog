import { useState } from 'react';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import DayDetail from '../components/DayDetail';
import WeightLineChart from '../components/WeightLineChart';
import { localDateStr, shortDate, avg } from '../utils/date';
import { buildDayRows } from '../utils/stats';
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyStats() {
  const { data: weightData,    refetch: refetchWeight }    = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts }  = useWorkouts();

  const [expandedDay, setExpandedDay] = useState(null);

  const days  = getLast7Days();
  const today = localDateStr(new Date());

  const rows = buildDayRows(days, weightData, nutritionData, workoutData);

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
            <WeightLineChart data={[...days].reverse().map((date, i) => ({ label: shortDate(date), weight: [...weights].reverse()[i] }))} />
          </div>
        </div>
      )}
    </div>
  );
}
