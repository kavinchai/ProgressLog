import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import Modal from '../components/Modal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import './WeeklyStats.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getLast7Days() {
  const days = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateStr(d));
  }
  return days;
}

function shortDate(iso) {
  const [, m, d] = iso.split('-');
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day = names[new Date(iso + 'T12:00:00').getDay()];
  return day + ' ' + parseInt(m) + '/' + parseInt(d);
}

function avg(nums) {
  const valid = nums.filter(n => n != null);
  if (!valid.length) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function groupByExercise(exerciseSets) {
  const map = {};
  for (const s of (exerciseSets ?? [])) {
    const key = `${s.exerciseName}__${s.weightLbs}`;
    if (!map[key]) map[key] = { name: s.exerciseName, weight: parseFloat(s.weightLbs), sets: [] };
    map[key].sets.push(s);
  }
  return Object.values(map)
    .sort((a, b) => a.name.localeCompare(b.name) || b.weight - a.weight)
    .map(g => ({ ...g, sets: g.sets.sort((a, b) => a.setNumber - b.setNumber) }));
}

// ── Weight modal ──────────────────────────────────────────────────────────────

function WeightModal({ prefillDate, existing, onClose, onSaved }) {
  const [date,   setDate]   = useState(existing?.logDate ?? prefillDate ?? '');
  const [weight, setWeight] = useState(existing?.weightLbs ?? '');
  const [err,    setErr]    = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api.post('/weight', { logDate: date, weightLbs: parseFloat(weight) });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Weight' : 'Log Weight'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="modal-field">
          <label className="modal-label">Weight (lbs)</label>
          <input className="modal-input" type="number" step="0.1" min="0"
            value={weight} onChange={e => setWeight(e.target.value)} required />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Day info modal (dayType + steps) ─────────────────────────────────────────

function DayInfoModal({ prefillDate, existing, onClose, onSaved }) {
  const [type,  setType]  = useState(existing?.dayType ?? 'training');
  const [steps, setSteps] = useState(existing?.steps ?? '');
  const [err,   setErr]   = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api.post('/nutrition', {
        logDate: existing?.logDate ?? prefillDate,
        dayType: type,
        steps: steps ? parseInt(steps) : null,
      });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Day Info" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Day Type</label>
          <select className="modal-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="training">training</option>
            <option value="rest">rest</option>
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Steps</label>
          <input className="modal-input" type="number" min="0"
            value={steps} onChange={e => setSteps(e.target.value)} placeholder="optional" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Meal modal ────────────────────────────────────────────────────────────────

function MealModal({ logId, existing, onClose, onSaved }) {
  const [name,     setName]     = useState(existing?.mealName ?? '');
  const [calories, setCalories] = useState(existing?.calories ?? '');
  const [protein,  setProtein]  = useState(existing?.proteinGrams ?? '');
  const [err,      setErr]      = useState('');
  const [saving,   setSaving]   = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const body = {
        mealName: name.trim() || null,
        calories: parseInt(calories),
        proteinGrams: parseInt(protein),
      };
      if (existing) {
        await api.put(`/nutrition/${logId}/meals/${existing.id}`, body);
      } else {
        await api.post(`/nutrition/${logId}/meals`, body);
      }
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function deleteMeal() {
    if (!existing) return;
    setSaving(true);
    try {
      await api.delete(`/nutrition/${logId}/meals/${existing.id}`);
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to delete.');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Meal' : 'Add Meal'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Meal Name</label>
          <input className="modal-input" type="text" placeholder="optional"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="modal-form-row">
          <div className="modal-field">
            <label className="modal-label">Calories</label>
            <input className="modal-input" type="number" min="0"
              value={calories} onChange={e => setCalories(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">Protein (g)</label>
            <input className="modal-input" type="number" min="0"
              value={protein} onChange={e => setProtein(e.target.value)} required />
          </div>
        </div>
        <div className="modal-actions">
          {existing && (
            <button type="button" className="btn-ghost" onClick={deleteMeal} disabled={saving}>
              [delete]
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayDetail({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo }) {
  const [modal,        setModal]        = useState(null);
  const [editMeal,     setEditMeal]     = useState(null);
  const [mealLogId,    setMealLogId]    = useState(null);
  const [editExercise, setEditExercise] = useState(null);

  const exerciseGroups = workoutEntry?.exerciseSets?.length
    ? groupByExercise(workoutEntry.exerciseSets)
    : [];

  const meals = nutritionEntry?.meals ?? [];

  function close() { setModal(null); }

  async function openAddMeal() {
    let logId = nutritionEntry?.id;
    if (!logId) {
      try {
        const res = await api.post('/nutrition', { logDate: date, dayType: 'training', steps: null });
        logId = res.data?.id;
        onRefetchN();
      } catch { /* ignore */ }
    }
    setMealLogId(logId);
    setEditMeal(null);
    setModal('meal');
  }

  return (
    <div className="day-detail">

      {/* Weight */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Weight</span>
          <div className="btn-actions">
            {weightEntry ? (
              <button className="btn btn-sm" onClick={() => setModal('weight-edit')}>[edit]</button>
            ) : (
              <button className="btn btn-sm" onClick={() => setModal('weight-add')}>[+ add]</button>
            )}
          </div>
        </div>
        <div className="day-detail-value">
          {weightEntry ? weightEntry.weightLbs + ' lbs' : <span className="muted">--</span>}
        </div>
      </div>

      {/* Nutrition */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Nutrition</span>
          <div className="btn-actions">
            {nutritionEntry && (
              <button className="btn btn-sm" onClick={() => setModal('dayinfo')}>[edit day info]</button>
            )}
            <button className="btn btn-sm" onClick={openAddMeal}>[+ add meal]</button>
          </div>
        </div>
        {nutritionEntry ? (
          <div>
            <div className="day-detail-value">
              {nutritionEntry.dayType}{nutritionEntry.steps != null ? ' / ' + nutritionEntry.steps.toLocaleString() + ' steps' : ''}
            </div>
            {meals.length > 0 && (
              <>
                <div className="day-meal-list">
                  {meals.map((meal, i) => (
                    <div key={meal.id} className="day-meal-row">
                      <span className="day-meal-name">{meal.mealName || `Meal ${i + 1}`}</span>
                      <span className="muted">{meal.calories} kcal / {meal.proteinGrams}g</span>
                      <button className="btn btn-sm"
                        onClick={() => { setMealLogId(nutritionEntry.id); setEditMeal(meal); setModal('meal'); }}>
                        [edit]
                      </button>
                    </div>
                  ))}
                </div>
                <div className="day-nutrition-total">
                  Total: {nutritionEntry.totalCalories ?? 0} kcal / {nutritionEntry.totalProtein ?? 0}g protein
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="day-detail-value"><span className="muted">--</span></div>
        )}
      </div>

      {/* Workout */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Workout</span>
          <div className="btn-actions">
            <button className="btn btn-sm" onClick={() => setModal('workout-add')}>[+ add]</button>
          </div>
        </div>
        {workoutEntry ? (
          exerciseGroups.length > 0 ? (
            <div className="day-exercise-list">
              {exerciseGroups.map(g => (
                <div key={`${g.name}-${g.weight}`} className="day-exercise-item">
                  <div className="day-exercise-row">
                    <span className="day-exercise-name">{g.name}</span>
                    {g.weight != null && (
                      <span className="muted">{g.weight} lbs</span>
                    )}
                    <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => setEditExercise({ sessionId: workoutEntry.id, name: g.name, sets: g.sets })}>
                      [edit]
                    </button>
                  </div>
                  <div className="day-exercise-reps">
                    {g.sets.map(s => s.reps ?? '--').join('  ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="day-detail-value"><span className="muted">session logged</span></div>
          )
        ) : (
          <div className="day-detail-value"><span className="muted">--</span></div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'weight-add' || modal === 'weight-edit') && (
        <WeightModal
          prefillDate={date}
          existing={modal === 'weight-edit' ? weightEntry : null}
          onClose={close}
          onSaved={onRefetchW}
        />
      )}
      {modal === 'dayinfo' && (
        <DayInfoModal
          prefillDate={date}
          existing={nutritionEntry}
          onClose={close}
          onSaved={onRefetchN}
        />
      )}
      {modal === 'meal' && (
        <MealModal
          logId={mealLogId}
          existing={editMeal}
          onClose={() => { setModal(null); setEditMeal(null); setMealLogId(null); }}
          onSaved={onRefetchN}
        />
      )}
      {modal === 'workout-add' && (
        <WorkoutBuilderModal
          prefillDate={date}
          onClose={close}
          onSaved={onRefetchWo}
        />
      )}
      {editExercise && (
        <EditExerciseModal
          sessionId={editExercise.sessionId}
          exerciseName={editExercise.name}
          exerciseSets={editExercise.sets}
          onClose={() => setEditExercise(null)}
          onSaved={onRefetchWo}
        />
      )}
    </div>
  );
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
          stroke="var(--fg)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: 'var(--fg)', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: 'var(--fg)', strokeWidth: 0 }}
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
      workout:  workoutEntry   ? (workoutEntry.exerciseSets?.length > 0
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
