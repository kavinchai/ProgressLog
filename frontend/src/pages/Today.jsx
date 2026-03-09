import { useState } from 'react';
import api from '../api';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import Modal from '../components/Modal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import './Today.css';

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return parseInt(m) + '/' + parseInt(d) + '/' + y;
}

// ── Weight modal ──────────────────────────────────────────────────────────────

function WeightModal({ existing, onClose, onSaved }) {
  const [date,   setDate]   = useState(existing?.logDate ?? TODAY);
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

function DayInfoModal({ existing, date, onClose, onSaved }) {
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
        logDate: date,
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

// ── Meal card ─────────────────────────────────────────────────────────────────

function MealCard({ meal, index, onEdit }) {
  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <span className="meal-card-name">{meal.mealName || `Meal ${index + 1}`}</span>
        <button className="btn btn-sm" onClick={onEdit}>[edit]</button>
      </div>
      <div className="meal-card-body">
        <span>{meal.calories} kcal</span>
        <span>{meal.proteinGrams}g protein</span>
      </div>
    </div>
  );
}

// ── Exercise cards ────────────────────────────────────────────────────────────

function groupByExercise(exerciseSets) {
  const map = {};
  for (const s of exerciseSets) {
    if (!map[s.exerciseName]) map[s.exerciseName] = [];
    map[s.exerciseName].push(s);
  }
  return Object.entries(map).map(([name, sets]) => ({
    name,
    sets: sets.sort((a, b) => a.setNumber - b.setNumber),
  }));
}

function ExerciseCard({ name, sets, onEdit }) {
  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <span className="exercise-card-name">{name}</span>
        <button className="btn btn-sm" onClick={onEdit}>[edit]</button>
      </div>
      <div className="exercise-card-sets">
        <div className="exercise-sets-head">
          <span>Set</span><span>Weight</span><span>Reps</span>
        </div>
        {sets.map(s => (
          <div key={s.id} className="exercise-set-row">
            <span>{s.setNumber}</span>
            <span>{s.weightLbs} lbs</span>
            <span>{s.reps}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({ label, value }) {
  return (
    <div className="today-data-row">
      <span className="today-data-label">{label}</span>
      <span className="today-data-value">{value ?? '--'}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Today() {
  const { data: weightData,    refetch: refetchW }  = useWeightLog();
  const { data: nutritionData, refetch: refetchN }  = useNutrition();
  const { data: workoutData,   refetch: refetchWo } = useWorkouts();

  const [modal,        setModal]        = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editExercise, setEditExercise] = useState(null);
  const [editMeal,     setEditMeal]     = useState(null); // meal object or null for new
  const [mealLogId,    setMealLogId]    = useState(null); // resolved log id for meal modal

  const todayW  = weightData.find(w => w.logDate === TODAY);
  const todayWo = workoutData.find(w => w.sessionDate === TODAY);
  const todayN  = nutritionData.find(n => n.logDate === TODAY);

  const exerciseGroups = todayWo?.exerciseSets?.length
    ? groupByExercise(todayWo.exerciseSets)
    : [];

  const meals = todayN?.meals ?? [];

  function closeModal() { setModal(null); setEditingEntry(null); }

  // Ensure a day log exists before adding a meal
  async function openAddMeal() {
    let logId = todayN?.id;
    if (!logId) {
      try {
        const res = await api.post('/nutrition', { logDate: TODAY, dayType: 'training', steps: null });
        logId = res.data?.id;
        refetchN();
      } catch { /* ignore */ }
    }
    setMealLogId(logId);
    setEditMeal(null);
    setModal('meal');
  }

  return (
    <div className="today-page">
      <div className="today-page-header">
        <span className="today-title">TODAY</span>
        <span className="today-date muted">{fmtDate(TODAY)}</span>
      </div>

      {/* WEIGHT */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Weight</span>
          <div className="btn-actions">
            {todayW && (
              <button className="btn btn-sm"
                onClick={() => { setEditingEntry(todayW); setModal('weight'); }}>
                [edit]
              </button>
            )}
            <button className="btn btn-sm"
              onClick={() => { setEditingEntry(null); setModal('weight'); }}>
              [+ add]
            </button>
          </div>
        </div>
        <div className="section-body">
          {todayW
            ? <DataRow label="Weight" value={todayW.weightLbs + ' lbs'} />
            : <span className="muted">No entry for today.</span>}
        </div>
      </div>

      {/* WORKOUT */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Workout</span>
          <div className="btn-actions">
            <button className="btn btn-sm" onClick={() => setModal('workout')}>
              [+ add]
            </button>
          </div>
        </div>
        <div className="section-body">
          {todayWo ? (
            exerciseGroups.length > 0 ? (
              <div className="exercise-cards">
                {exerciseGroups.map(g => (
                  <ExerciseCard
                    key={g.name}
                    name={g.name}
                    sets={g.sets}
                    onEdit={() => setEditExercise({ sessionId: todayWo.id, name: g.name, sets: g.sets })}
                  />
                ))}
              </div>
            ) : (
              <span className="muted">Session logged. No exercises yet.</span>
            )
          ) : (
            <span className="muted">No entry for today.</span>
          )}
        </div>
      </div>

      {/* NUTRITION */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Nutrition</span>
          <div className="btn-actions">
            {todayN && (
              <button className="btn btn-sm"
                onClick={() => { setEditingEntry(todayN); setModal('dayinfo'); }}>
                [edit day info]
              </button>
            )}
            <button className="btn btn-sm" onClick={openAddMeal}>
              [+ add meal]
            </button>
          </div>
        </div>
        <div className="section-body">
          {todayN ? (
            <>
              <div className="nutrition-day-info">
                <DataRow label="Day Type" value={todayN.dayType} />
                {todayN.steps != null && (
                  <DataRow label="Steps" value={todayN.steps.toLocaleString()} />
                )}
              </div>
              {meals.length > 0 && (
                <>
                  <div className="meal-cards">
                    {meals.map((meal, i) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        index={i}
                        onEdit={() => { setMealLogId(todayN.id); setEditMeal(meal); setModal('meal'); }}
                      />
                    ))}
                  </div>
                  <div className="nutrition-totals">
                    <span>Total: {todayN.totalCalories ?? 0} kcal</span>
                    <span>{todayN.totalProtein ?? 0}g protein</span>
                  </div>
                </>
              )}
              {meals.length === 0 && (
                <span className="muted">No meals logged yet.</span>
              )}
            </>
          ) : (
            <span className="muted">No entry for today.</span>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'weight' && (
        <WeightModal existing={editingEntry} onClose={closeModal} onSaved={refetchW} />
      )}
      {modal === 'workout' && (
        <WorkoutBuilderModal
          prefillDate={TODAY}
          onClose={closeModal}
          onSaved={refetchWo}
        />
      )}
      {modal === 'dayinfo' && (
        <DayInfoModal
          existing={editingEntry}
          date={TODAY}
          onClose={closeModal}
          onSaved={refetchN}
        />
      )}
      {modal === 'meal' && (
        <MealModal
          logId={mealLogId}
          existing={editMeal}
          onClose={() => { setModal(null); setEditMeal(null); setMealLogId(null); }}
          onSaved={refetchN}
        />
      )}
      {editExercise && (
        <EditExerciseModal
          sessionId={editExercise.sessionId}
          exerciseName={editExercise.name}
          exerciseSets={editExercise.sets}
          onClose={() => setEditExercise(null)}
          onSaved={refetchWo}
        />
      )}
    </div>
  );
}
