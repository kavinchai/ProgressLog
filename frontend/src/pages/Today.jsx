import { useState, useRef } from 'react';
import api from '../api';
import useWeightLog   from '../hooks/useWeightLog';
import useNutrition   from '../hooks/useNutrition';
import useWorkouts    from '../hooks/useWorkouts';
import useUserProfile from '../hooks/useUserProfile';
import useTemplates   from '../hooks/useTemplates';
import usePRs         from '../hooks/usePRs';
import { useDayActions } from '../hooks/useDayActions';
import WeightModal         from '../components/WeightModal';
import DayInfoModal        from '../components/DayInfoModal';
import MealModal           from '../components/MealModal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import { groupByExercise } from '../utils/workout';
import { localDateStr, formatDateFull as fmtDate } from '../utils/date';
import './Today.css';

const TODAY = localDateStr(new Date());

// ── Meal card ─────────────────────────────────────────────────────────────────

function MealCard({ meal, index, onEdit }) {
  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <span className="meal-card-name">{meal.mealName || `Meal ${index + 1}`}</span>
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
      </div>
      <div className="meal-card-body">
        <span>{meal.calories} kcal</span>
        <span>{meal.proteinGrams}g protein</span>
      </div>
    </div>
  );
}

// ── Exercise cards ────────────────────────────────────────────────────────────

function ExerciseCard({ name, weight, sets, onEdit, isPR }) {
  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <span className="exercise-card-name">
          {name}
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8, fontSize: 'var(--fs-sm)' }}>{weight} lbs</span>
          {isPR && <span className="pr-badge">PR</span>}
        </span>
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
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
  const { data: weightData,    refetch: refetchWeight }   = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts }  = useWorkouts();
  const { goals } = useUserProfile();
  const { data: templates } = useTemplates();
  const { data: prsData, refetch: refetchPRs } = usePRs();

  const [modal,           setModal]           = useState(null);
  const [showPRHistory,   setShowPRHistory]    = useState(false);
  const [editingEntry,    setEditingEntry]     = useState(null);
  const [editExercise,    setEditExercise]     = useState(null);
  const [editMeal,        setEditMeal]         = useState(null);
  const [mealLogId,       setMealLogId]        = useState(null);
  const [prefillExercises,setPrefillExercises] = useState(null);
  const [templateMenuOpen,setTemplateMenuOpen] = useState(false);
  const templateBtnRef = useRef(null);

  const todayWeightEntry    = weightData.find(w => w.logDate === TODAY);
  const todayWorkoutEntry   = workoutData.find(w => w.sessionDate === TODAY);
  const todayNutritionEntry = nutritionData.find(n => n.logDate === TODAY);

  const {
    renamingSession, setRenamingSession, renameValue, setRenameValue,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, getOrCreateNutritionLogId,
  } = useDayActions({
    date: TODAY,
    weightEntry:    todayWeightEntry,
    nutritionEntry: todayNutritionEntry,
    workoutEntry:   todayWorkoutEntry,
    onRefetchW:     refetchWeight,
    onRefetchN:     refetchNutrition,
    onRefetchWo:    refetchWorkouts,
  });

  const exerciseGroups = todayWorkoutEntry?.exerciseSets?.length
    ? groupByExercise(todayWorkoutEntry.exerciseSets)
    : [];

  const prMap = Object.fromEntries(
    (prsData ?? []).map(pr => [pr.exerciseName, parseFloat(pr.maxWeightLbs)])
  );

  const todayMaxByExercise = {};
  for (const g of exerciseGroups) {
    if (todayMaxByExercise[g.name] == null || g.weight > todayMaxByExercise[g.name]) {
      todayMaxByExercise[g.name] = g.weight;
    }
  }

  const meals = todayNutritionEntry?.meals ?? [];

  function closeModal() { setModal(null); setEditingEntry(null); setPrefillExercises(null); }

  function openFromTemplate(template) {
    setPrefillExercises(template.exercises);
    setTemplateMenuOpen(false);
    setModal('workout');
  }

  async function toggleDayType() {
    const current = todayNutritionEntry?.dayType ?? 'training';
    const next    = current === 'training' ? 'rest' : 'training';
    try {
      await api.post('/nutrition', {
        logDate: TODAY,
        dayType: next,
        steps: todayNutritionEntry?.steps ?? null,
      });
      refetchNutrition();
    } catch { /* ignore */ }
  }

  async function openAddMeal() {
    const logId = await getOrCreateNutritionLogId();
    setMealLogId(logId);
    setEditMeal(null);
    setModal('meal');
  }

  return (
    <div className="today-page">
      <div className="today-page-header">
        <span className="today-title">Today</span>
        <span className="today-date muted">{fmtDate(TODAY)}</span>
        <button className="today-day-type-toggle" onClick={toggleDayType}>
          {todayNutritionEntry?.dayType ?? 'training'}
        </button>
      </div>

      {/* WEIGHT */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Weight</span>
          <div className="btn-actions">
            {todayWeightEntry && (
              <>
                <button className="btn btn-sm"
                  onClick={() => { setEditingEntry(todayWeightEntry); setModal('weight'); }}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={deleteWeight}>Delete</button>
              </>
            )}
            {!todayWeightEntry && (
              <button className="btn btn-sm btn-primary"
                onClick={() => { setEditingEntry(null); setModal('weight'); }}>
                + Add
              </button>
            )}
          </div>
        </div>
        <div className="section-body">
          {todayWeightEntry
            ? <DataRow label="Weight" value={todayWeightEntry.weightLbs + ' lbs'} />
            : <span className="muted">No entry for today.</span>}
        </div>
      </div>

      {/* WORKOUT */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">
            Workout
            {todayWorkoutEntry?.sessionName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 'var(--fs-sm)', textTransform: 'none' }}>
                {todayWorkoutEntry.sessionName}
              </span>
            )}
          </span>
          <div className="btn-actions">
            {todayWorkoutEntry && !renamingSession && (
              <button className="btn btn-sm" onClick={() => { setRenameValue(todayWorkoutEntry.sessionName ?? ''); setRenamingSession(true); }}>Rename</button>
            )}
            {renamingSession && (
              <>
                <input
                  className="modal-input"
                  style={{ width: 140, padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                  type="text"
                  placeholder="Session name"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenamingSession(false); }}
                  autoFocus
                />
                <button className="btn btn-sm btn-primary" onClick={submitRename}>Save</button>
                <button className="btn btn-sm" onClick={() => setRenamingSession(false)}>&times;</button>
              </>
            )}
            {todayWorkoutEntry && (
              <button className="btn btn-sm btn-danger" onClick={deleteWorkoutSession}>Delete</button>
            )}
            <button className="btn btn-sm btn-primary" onClick={() => { setPrefillExercises(null); setModal('workout'); }}>
              + Add
            </button>
            {(templates ?? []).length > 0 && (
              <div className="today-template-picker">
                <button
                  ref={templateBtnRef}
                  className="btn btn-sm"
                  onClick={() => setTemplateMenuOpen(o => !o)}
                  onBlur={() => setTimeout(() => setTemplateMenuOpen(false), 150)}
                >
                  Template
                </button>
                {templateMenuOpen && (
                  <ul className="today-template-menu">
                    {(templates ?? []).map(t => (
                      <li
                        key={t.id}
                        className="today-template-item"
                        onMouseDown={() => openFromTemplate(t)}
                      >
                        {t.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="section-body">
          {todayWorkoutEntry ? (
            exerciseGroups.length > 0 ? (
              <div className="exercise-cards">
                {exerciseGroups.map(g => {
                  const isPR = g.weight === todayMaxByExercise[g.name] && g.weight >= (prMap[g.name] ?? g.weight);
                  return (
                    <ExerciseCard
                      key={`${g.name}-${g.weight}`}
                      name={g.name}
                      weight={g.weight}
                      sets={g.sets}
                      isPR={isPR}
                      onEdit={() => setEditExercise({ sessionId: todayWorkoutEntry.id, name: g.name, sets: g.sets })}
                    />
                  );
                })}
              </div>
            ) : (
              <span className="muted">Session logged. No exercises yet.</span>
            )
          ) : (
            <span className="muted">No entry for today.</span>
          )}
          {(prsData ?? []).length > 0 && (
            <div className="pr-history">
              <button className="pr-history-toggle" onClick={() => setShowPRHistory(v => !v)}>
                {showPRHistory ? '▾' : '▸'} Personal Records
              </button>
              {showPRHistory && (
                <table className="pr-history-table">
                  <thead>
                    <tr><th>Exercise</th><th>Weight</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {(prsData ?? []).map(pr => (
                      <tr key={pr.exerciseName}>
                        <td>{pr.exerciseName}</td>
                        <td>{parseFloat(pr.maxWeightLbs)} lbs</td>
                        <td className="muted">{pr.achievedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NUTRITION */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Nutrition</span>
          <div className="btn-actions">
            {todayNutritionEntry && (
              <>
                <button className="btn btn-sm"
                  onClick={() => { setEditingEntry(todayNutritionEntry); setModal('dayinfo'); }}>
                  Edit Day
                </button>
                <button className="btn btn-sm btn-danger" onClick={deleteNutritionDay}>Delete</button>
              </>
            )}
            <button className="btn btn-sm btn-primary" onClick={openAddMeal}>
              + Add Meal
            </button>
          </div>
        </div>
        <div className="section-body">
          {todayNutritionEntry ? (
            <>
              <div className="nutrition-day-info">
                <DataRow label="Day Type" value={todayNutritionEntry.dayType} />
                {todayNutritionEntry.steps != null && (
                  <DataRow label="Steps" value={todayNutritionEntry.steps.toLocaleString()} />
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
                        onEdit={() => { setMealLogId(todayNutritionEntry.id); setEditMeal(meal); setModal('meal'); }}
                      />
                    ))}
                  </div>
                  <div className="nutrition-totals">
                    {(() => {
                      const calTarget = todayNutritionEntry.dayType === 'training'
                        ? goals.calorieTargetTraining
                        : goals.calorieTargetRest;
                      const calEaten  = todayNutritionEntry.totalCalories ?? 0;
                      const protEaten = todayNutritionEntry.totalProtein  ?? 0;
                      const calLeft   = calTarget - calEaten;
                      const protLeft  = goals.proteinTarget - protEaten;
                      return (
                        <>
                          <div className="nutrition-totals-row">
                            <span className="nutrition-totals-label">Calories</span>
                            <span>{calEaten} / {calTarget} kcal</span>
                            <span className={calLeft <= 0 ? 'nutrition-goal-met' : 'nutrition-goal-remaining'}>
                              {calLeft <= 0 ? `+${Math.abs(calLeft)} over` : `${calLeft} remaining`}
                            </span>
                          </div>
                          <div className="nutrition-totals-row">
                            <span className="nutrition-totals-label">Protein</span>
                            <span>{protEaten} / {goals.proteinTarget} g</span>
                            <span className={protLeft <= 0 ? 'nutrition-goal-met' : 'nutrition-goal-remaining'}>
                              {protLeft <= 0 ? `+${Math.abs(protLeft)}g over` : `${protLeft}g remaining`}
                            </span>
                          </div>
                        </>
                      );
                    })()}
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
        <WeightModal prefillDate={TODAY} existing={editingEntry} onClose={closeModal} onSaved={refetchWeight} />
      )}
      {modal === 'workout' && (
        <WorkoutBuilderModal
          prefillDate={TODAY}
          prefillExercises={prefillExercises}
          onClose={closeModal}
          onSaved={() => { refetchWorkouts(); refetchPRs(); }}
        />
      )}
      {modal === 'dayinfo' && (
        <DayInfoModal
          prefillDate={TODAY}
          existing={editingEntry}
          onClose={closeModal}
          onSaved={refetchNutrition}
        />
      )}
      {modal === 'meal' && (
        <MealModal
          logId={mealLogId}
          existing={editMeal}
          onClose={() => { setModal(null); setEditMeal(null); setMealLogId(null); }}
          onSaved={refetchNutrition}
        />
      )}
      {editExercise && (
        <EditExerciseModal
          sessionId={editExercise.sessionId}
          exerciseName={editExercise.name}
          exerciseSets={editExercise.sets}
          onClose={() => setEditExercise(null)}
          onSaved={refetchWorkouts}
        />
      )}
    </div>
  );
}
