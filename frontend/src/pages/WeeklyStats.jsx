import { useState } from 'react';
import api from '../api';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import Modal from '../components/Modal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import './WeeklyStats.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
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
    if (!map[s.exerciseName]) map[s.exerciseName] = [];
    map[s.exerciseName].push(s);
  }
  return Object.entries(map).map(([name, sets]) => ({
    name,
    sets: sets.sort((a, b) => a.setNumber - b.setNumber),
  }));
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
  const [name,   setName]   = useState(existing?.mealName ?? '');
  const [cal,    setCal]    = useState(existing?.calories ?? '');
  const [prot,   setProt]   = useState(existing?.proteinGrams ?? '');
  const [err,    setErr]    = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const body = {
        mealName: name.trim() || null,
        calories: parseInt(cal),
        proteinGrams: parseInt(prot),
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
              value={cal} onChange={e => setCal(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">Protein (g)</label>
            <input className="modal-input" type="number" min="0"
              value={prot} onChange={e => setProt(e.target.value)} required />
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
            {weightEntry && (
              <button className="btn btn-sm" onClick={() => setModal('weight-edit')}>[edit]</button>
            )}
            <button className="btn btn-sm" onClick={() => setModal('weight-add')}>[+ add]</button>
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
                <div key={g.name} className="day-exercise-row">
                  <span className="day-exercise-name">{g.name}</span>
                  <span className="day-exercise-sets muted">{g.sets.length} sets</span>
                  <button className="btn btn-sm"
                    onClick={() => setEditExercise({ sessionId: workoutEntry.id, name: g.name, sets: g.sets })}>
                    [edit]
                  </button>
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

// ── Weight bars ───────────────────────────────────────────────────────────────

function WeightBars({ days, weights }) {
  const valid = weights.filter(w => w != null);
  if (!valid.length) return null;
  const minW  = Math.min(...valid) - 0.5;
  const maxW  = Math.max(...valid) + 0.5;
  const range = maxW - minW || 1;

  return (
    <div className="weight-bars">
      {days.map((date, i) => {
        const w   = weights[i];
        const pct = w != null ? ((w - minW) / range) * 100 : 0;
        return (
          <div key={date} className="weight-bar-row">
            <span className="weight-bar-label">{shortDate(date).slice(0, 6)}</span>
            <div className="weight-bar-track">
              <div className="weight-bar-fill" style={{ width: w != null ? pct + '%' : '0%' }} />
            </div>
            <span className="weight-bar-val">{w != null ? w + ' lbs' : '--'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyStats() {
  const { data: weightData,    refetch: refetchW }  = useWeightLog();
  const { data: nutritionData, refetch: refetchN }  = useNutrition();
  const { data: workoutData,   refetch: refetchWo } = useWorkouts();

  const [expandedDay, setExpandedDay] = useState(null);

  const days  = getLast7Days();
  const today = new Date().toISOString().slice(0, 10);

  const rows = days.map(date => {
    const w  = weightData.find(x => x.logDate === date);
    const n  = nutritionData.find(x => x.logDate === date);
    const wo = workoutData.find(x => x.sessionDate === date);
    return {
      date,
      weightEntry: w, nutritionEntry: n, workoutEntry: wo,
      weight:   w  ? parseFloat(w.weightLbs)       : null,
      calories: n  ? (n.totalCalories ?? null)      : null,
      protein:  n  ? (n.totalProtein  ?? null)      : null,
      workout:  wo ? (wo.exerciseSets?.length > 0 ? groupByExercise(wo.exerciseSets).length + ' exercises' : 'logged') : null,
    };
  });

  const weights      = rows.map(r => r.weight);
  const workoutCount = rows.filter(r => r.workout).length;
  const avgWeight    = avg(weights);
  const avgCalories  = avg(rows.map(r => r.calories));
  const avgProtein   = avg(rows.map(r => r.protein));

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
                {rows.map(r => (
                  <>
                    <tr
                      key={r.date}
                      className={'weekly-row' + (r.date === today ? ' today-row' : '') + (expandedDay === r.date ? ' expanded-row' : '')}
                      onClick={() => setExpandedDay(expandedDay === r.date ? null : r.date)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{shortDate(r.date)}</td>
                      <td>{r.weight != null ? r.weight + ' lbs' : '--'}</td>
                      <td>{r.calories != null ? r.calories : '--'}</td>
                      <td>{r.protein != null ? r.protein + 'g' : '--'}</td>
                      <td>{r.workout ?? '--'}</td>
                    </tr>
                    {expandedDay === r.date && (
                      <tr key={r.date + '-detail'} className="detail-row">
                        <td colSpan={5}>
                          <DayDetail
                            date={r.date}
                            weightEntry={r.weightEntry}
                            nutritionEntry={r.nutritionEntry}
                            workoutEntry={r.workoutEntry}
                            onRefetchW={refetchW}
                            onRefetchN={refetchN}
                            onRefetchWo={refetchWo}
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

      {/* Weight bars */}
      {weights.some(w => w != null) && (
        <div className="section-box">
          <div className="section-header">
            <span className="section-title">Weight Trend</span>
          </div>
          <div className="section-body">
            <WeightBars days={days} weights={weights} />
          </div>
        </div>
      )}
    </div>
  );
}
