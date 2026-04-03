import { useState, useRef } from 'react';
import api from '../api';
import useWeightLog   from '../hooks/useWeightLog';
import useNutrition   from '../hooks/useNutrition';
import useWorkouts    from '../hooks/useWorkouts';
import useUserProfile from '../hooks/useUserProfile';
import useTemplates   from '../hooks/useTemplates';
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

function ExerciseCard({ name, weight, sets, onEdit }) {
  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <span className="exercise-card-name">
          {name}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8, fontSize: 'var(--font-size-sm)' }}>{weight} lbs</span>
        </span>
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
  const { data: weightData,    refetch: refetchWeight }   = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts }  = useWorkouts();
  const { goals } = useUserProfile();
  const { data: templates } = useTemplates();

  const [modal,           setModal]           = useState(null);
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

  const exerciseGroups = todayWorkoutEntry?.exerciseSets?.length
    ? groupByExercise(todayWorkoutEntry.exerciseSets)
    : [];

  const meals = todayNutritionEntry?.meals ?? [];

  function closeModal() { setModal(null); setEditingEntry(null); setPrefillExercises(null); }

  function openFromTemplate(template) {
    setPrefillExercises(template.exercises);
    setTemplateMenuOpen(false);
    setModal('workout');
  }

  async function deleteWeight() {
    if (!todayWeightEntry) return;
    try { await api.delete(`/weight/${todayWeightEntry.id}`); refetchWeight(); }
    catch { /* ignore */ }
  }

  async function deleteNutritionDay() {
    if (!todayNutritionEntry) return;
    try { await api.delete(`/nutrition/${todayNutritionEntry.id}`); refetchNutrition(); }
    catch { /* ignore */ }
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

  async function deleteWorkoutSession() {
    if (!todayWorkoutEntry) return;
    try { await api.delete(`/workouts/${todayWorkoutEntry.id}`); refetchWorkouts(); }
    catch { /* ignore */ }
  }

  // Ensure a day log exists before adding a meal
  async function openAddMeal() {
    let logId = todayNutritionEntry?.id;
    if (!logId) {
      try {
        const res = await api.post('/nutrition', { logDate: TODAY, dayType: 'training', steps: null });
        logId = res.data?.id;
        refetchNutrition();
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
                  [edit]
                </button>
                <button className="btn btn-sm" onClick={deleteWeight}>[delete]</button>
              </>
            )}
            {!todayWeightEntry && (
              <button className="btn btn-sm"
                onClick={() => { setEditingEntry(null); setModal('weight'); }}>
                [+ add]
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
          <span className="section-title">Workout</span>
          <div className="btn-actions">
            {todayWorkoutEntry && (
              <button className="btn btn-sm" onClick={deleteWorkoutSession}>[delete session]</button>
            )}
            <button className="btn btn-sm" onClick={() => { setPrefillExercises(null); setModal('workout'); }}>
              [+ add]
            </button>
            {(templates ?? []).length > 0 && (
              <div className="today-template-picker">
                <button
                  ref={templateBtnRef}
                  className="btn btn-sm"
                  onClick={() => setTemplateMenuOpen(o => !o)}
                  onBlur={() => setTimeout(() => setTemplateMenuOpen(false), 150)}
                >
                  [from template]
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
                {exerciseGroups.map(g => (
                  <ExerciseCard
                    key={`${g.name}-${g.weight}`}
                    name={g.name}
                    weight={g.weight}
                    sets={g.sets}
                    onEdit={() => setEditExercise({ sessionId: todayWorkoutEntry.id, name: g.name, sets: g.sets })}
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
            {todayNutritionEntry && (
              <>
                <button className="btn btn-sm"
                  onClick={() => { setEditingEntry(todayNutritionEntry); setModal('dayinfo'); }}>
                  [edit day info]
                </button>
                <button className="btn btn-sm" onClick={deleteNutritionDay}>[delete day]</button>
              </>
            )}
            <button className="btn btn-sm" onClick={openAddMeal}>
              [+ add meal]
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
          onSaved={refetchWorkouts}
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
