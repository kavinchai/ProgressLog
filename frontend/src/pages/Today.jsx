import { useState } from 'react';
import api from '../api';
import useWeightLog   from '../hooks/useWeightLog';
import useNutrition   from '../hooks/useNutrition';
import useWorkouts    from '../hooks/useWorkouts';
import useSteps       from '../hooks/useSteps';
import useUserProfile from '../hooks/useUserProfile';
import usePRs         from '../hooks/usePRs';
import { useDayActions } from '../hooks/useDayActions';
import WeightModal         from '../components/WeightModal';
import DayInfoModal        from '../components/DayInfoModal';
import MealModal           from '../components/MealModal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import ConfirmDeleteModal  from '../components/ConfirmDeleteModal';
import BodyMap from '../components/BodyMap';
import MuscleDetailPanel from '../components/MuscleDetailPanel';
import { groupByExercise, detectType, formatDuration, calcPace } from '../utils/workout';
import { mergeWorkoutSessions } from '../utils/stats';
import { buildMuscleGroupStats } from '../utils/muscleMapping';
import useWeightUnit from '../hooks/useWeightUnit';
import useToday from '../hooks/useToday';
import { formatDateFull as fmtDate } from '../utils/date';
import '../pages/WeeklyStats.css';
import './Today.css';

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
  const type = detectType(sets);
  const { unit, toDisplay } = useWeightUnit();

  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <span className="exercise-card-name">
          {name}
          {type === 'lifting' && (
            <span className="exercise-card-weight">{toDisplay(weight)} {unit}</span>
          )}
          {isPR && <span className="pr-badge">PR</span>}
        </span>
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
      </div>
      <div className="exercise-card-sets">
        {type === 'run' ? (
          <>
            <div className="exercise-sets-head exercise-sets-head--cardio" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <span>Distance</span><span>Time</span><span>Pace</span>
            </div>
            {sets.map(s => (
              <div key={s.id} className="exercise-set-row exercise-set-row--cardio" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <span>{s.distanceMiles != null ? `${s.distanceMiles} mi` : '--'}</span>
                <span>{formatDuration(s.durationSeconds)}</span>
                <span>{calcPace(s.distanceMiles, s.durationSeconds) ?? '--'}</span>
              </div>
            ))}
          </>
        ) : type === 'timed' ? (
          <>
            <div className="exercise-sets-head" style={{ gridTemplateColumns: '36px 1fr' }}>
              <span>#</span><span>Duration</span>
            </div>
            {sets.map((s, i) => (
              <div key={s.id} className="exercise-set-row" style={{ gridTemplateColumns: '36px 1fr' }}>
                <span>{i + 1}</span>
                <span>{formatDuration(s.durationSeconds)}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="exercise-sets-head">
              <span>Set</span><span>Weight</span><span>Reps</span>
            </div>
            {sets.map(s => (
              <div key={s.id} className="exercise-set-row">
                <span>{s.setNumber}</span>
                <span>{toDisplay(s.weightLbs)} {unit}</span>
                <span>{s.reps}</span>
              </div>
            ))}
          </>
        )}
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
  const TODAY = useToday();
  const { data: weightData,    refetch: refetchWeight,    loading: loadingWeight,    error: errorWeight }    = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition, loading: loadingNutrition, error: errorNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts,  loading: loadingWorkouts,  error: errorWorkouts }  = useWorkouts();
  const { data: stepData,      refetch: refetchSteps,     loading: loadingSteps,     error: errorSteps }     = useSteps();
  const { goals, loading: loadingProfile } = useUserProfile();
  const { data: prsData, refetch: refetchPRs, loading: loadingPRs, error: errorPRs } = usePRs();
  const { unit, toDisplay } = useWeightUnit();

  const isLoading = loadingWeight || loadingNutrition || loadingWorkouts || loadingSteps || loadingProfile || loadingPRs;
  const hasError = errorWeight || errorNutrition || errorWorkouts || errorSteps || errorPRs;
  const firstError = errorWeight || errorNutrition || errorWorkouts || errorSteps || errorPRs;

  const [modal,           setModal]           = useState(null);
  const [editingEntry,    setEditingEntry]     = useState(null);
  const [editExercise,    setEditExercise]     = useState(null);
  const [editMeal,        setEditMeal]         = useState(null);
  const [mealLogId,       setMealLogId]        = useState(null);
  const [appendBlankExercise, setAppendBlankExercise] = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(null);
  const [selectedMuscle,   setSelectedMuscle]   = useState(null);

  const todayWeightEntry    = weightData.find(w => w.logDate === TODAY);
  const todayWorkoutSessions = workoutData.filter(w => w.sessionDate === TODAY);
  const todayWorkoutEntry   = mergeWorkoutSessions(todayWorkoutSessions);
  const editableWorkoutSession = todayWorkoutSessions[0] ?? null;
  const hasSingleWorkoutSession = todayWorkoutSessions.length === 1;
  const todayNutritionEntry = nutritionData.find(n => n.logDate === TODAY);
  const todayStepEntry      = stepData.find(s => s.logDate === TODAY);

  const [editingSteps,    setEditingSteps]    = useState(false);
  const [stepsValue,      setStepsValue]      = useState('');
  const [stepsSaving,     setStepsSaving]     = useState(false);
  const [dayTypeSaving,   setDayTypeSaving]   = useState(false);
  const [addingMeal,      setAddingMeal]      = useState(false);

  const {
    renamingSession, setRenamingSession, renameValue, setRenameValue, renameSaving,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, saveSteps, getOrCreateNutritionLogId,
  } = useDayActions({
    date: TODAY,
    weightEntry:    todayWeightEntry,
    nutritionEntry: todayNutritionEntry,
    workoutEntry:   todayWorkoutEntry,
    stepEntry:      todayStepEntry,
    onRefetchW:     refetchWeight,
    onRefetchN:     refetchNutrition,
    onRefetchWo:    refetchWorkouts,
    onRefetchS:     refetchSteps,
  });

  const exerciseGroups = todayWorkoutEntry?.exerciseSets?.length
    ? groupByExercise(todayWorkoutEntry.exerciseSets)
    : [];

  const muscleStats = buildMuscleGroupStats(todayWorkoutSessions);

  // PR comparison: lexicographic (weight, setCount, maxRepsInSet). Higher is better.
  // Returns >0 if a beats b, <0 if a loses to b, 0 if tied.
  function comparePRTuple(a, b) {
    if (a.weight !== b.weight) return a.weight - b.weight;
    if (a.setCount !== b.setCount) return a.setCount - b.setCount;
    return a.maxRepsInSet - b.maxRepsInSet;
  }

  function tupleForGroup(g) {
    return {
      weight: g.weight,
      setCount: g.sets.length,
      maxRepsInSet: g.sets.reduce((m, s) => Math.max(m, s.reps ?? 0), 0),
    };
  }

  const prMap = Object.fromEntries(
    (prsData ?? []).map(pr => [pr.exerciseName, {
      weight: parseFloat(pr.maxWeightLbs),
      setCount: pr.setCount ?? 0,
      maxRepsInSet: pr.maxRepsInSet ?? 0,
    }])
  );

  // Find today's best tuple per exercise (across its weight-groups).
  const todayBestByExercise = {};
  for (const g of exerciseGroups) {
    const tuple = tupleForGroup(g);
    const current = todayBestByExercise[g.name];
    if (current == null || comparePRTuple(tuple, current) > 0) {
      todayBestByExercise[g.name] = tuple;
    }
  }

  const meals = todayNutritionEntry?.meals ?? [];

  function closeModal() {
    setModal(null);
    setEditingEntry(null);
    setAppendBlankExercise(false);
  }

  function openWorkoutModal({ appendBlank = false } = {}) {
    setAppendBlankExercise(appendBlank);
    setModal('workout');
  }

  async function toggleDayType() {
    if (dayTypeSaving) return;
    setDayTypeSaving(true);
    const current = todayNutritionEntry?.dayType ?? 'training';
    const next    = current === 'training' ? 'rest' : 'training';
    try {
      await api.post('/nutrition', {
        logDate: TODAY,
        dayType: next,
      });
      refetchNutrition();
    } catch (err) { console.warn('toggleDayType failed:', err); }
    finally { setDayTypeSaving(false); }
  }

  async function openAddMeal() {
    if (addingMeal) return;
    setAddingMeal(true);
    try {
      const logId = await getOrCreateNutritionLogId();
      setMealLogId(logId);
      setEditMeal(null);
      setModal('meal');
    } finally { setAddingMeal(false); }
  }

  async function commitSteps() {
    if (stepsSaving) return;
    setStepsSaving(true);
    try {
      await saveSteps(stepsValue || null);
      setEditingSteps(false);
    } finally { setStepsSaving(false); }
  }

  if (isLoading) {
    return (
      <div className="today-page">
        <div className="today-page-header">
          <span className="today-title">Today</span>
          <span className="today-date muted">{fmtDate(TODAY)}</span>
        </div>
        <div className="loading-state">Loading your daily stats…</div>
      </div>
    );
  }

  return (
    <div className="today-page">
      {hasError && (
        <div className="notice error">
          Error loading data: {firstError}. Please refresh the page.
        </div>
      )}
      <div className="today-page-header">
        <span className="today-title">Today</span>
        <span className="today-date muted">{fmtDate(TODAY)}</span>
        <button className="today-day-type-toggle" onClick={toggleDayType} disabled={dayTypeSaving}>
          {todayNutritionEntry?.dayType ?? 'training'}
        </button>
      </div>

      <div className="weekly-content-layout">
        <div className="weekly-main-col">

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
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete({ title: 'Delete Weight Entry', message: 'Are you sure you want to delete this weight entry?', onDelete: () => api.delete(`/weight/${todayWeightEntry.id}`).then(refetchWeight), onUndone: refetchWeight })}>Delete</button>
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
            ? <DataRow label="Weight" value={toDisplay(todayWeightEntry.weightLbs) + ' ' + unit} />
            : <span className="muted">No entry for today.</span>}
        </div>
      </div>

      {/* STEPS */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Steps</span>
          <div className="btn-actions">
            {!editingSteps && (
              <button className="btn btn-sm" onClick={() => {
                setStepsValue(todayStepEntry ? String(todayStepEntry.steps) : '');
                setEditingSteps(true);
              }}>
                {todayStepEntry ? 'Edit' : '+ Add'}
              </button>
            )}
            {!editingSteps && todayStepEntry && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete({ title: 'Delete Steps', message: 'Are you sure you want to delete this step entry?', onDelete: () => api.delete(`/steps/${todayStepEntry.id}`).then(refetchSteps), onUndone: refetchSteps })}>Delete</button>
            )}
          </div>
        </div>
        <div className="section-body">
          {editingSteps ? (
            <div className="today-steps-edit">
              <input
                className="modal-input"
                type="number" min="0" placeholder="Steps"
                value={stepsValue}
                disabled={stepsSaving}
                onChange={e => setStepsValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitSteps();
                  if (e.key === 'Escape') setEditingSteps(false);
                }}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={commitSteps} disabled={stepsSaving}>{stepsSaving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-sm" onClick={() => setEditingSteps(false)} disabled={stepsSaving}>&times;</button>
            </div>
          ) : (
            todayStepEntry
              ? <DataRow label="Steps" value={todayStepEntry.steps.toLocaleString()} />
              : <span className="muted">No steps logged.</span>
          )}
        </div>
      </div>

      {/* WORKOUT */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">
            Workout
            {todayWorkoutEntry?.sessionName && (
              <span className="workout-session-name">
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
                  className="modal-input rename-session-input"
                  type="text"
                  placeholder="Session name"
                  value={renameValue}
                  disabled={renameSaving}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenamingSession(false); }}
                  autoFocus
                />
                <button className="btn btn-sm btn-primary" onClick={submitRename} disabled={renameSaving}>{renameSaving ? 'Saving…' : 'Save'}</button>
                <button className="btn btn-sm" onClick={() => setRenamingSession(false)} disabled={renameSaving}>&times;</button>
              </>
            )}
            {todayWorkoutEntry && hasSingleWorkoutSession && (
              <button className="btn btn-sm" onClick={() => openWorkoutModal()}>
                Edit Workout
              </button>
            )}
            {todayWorkoutEntry && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete({ title: 'Delete Workout', message: 'Are you sure you want to delete this workout session?', onDelete: () => api.delete(`/workouts/${todayWorkoutEntry.id}`).then(refetchWorkouts), onUndone: refetchWorkouts })}>Delete</button>
            )}
            {!todayWorkoutEntry && (
              <button className="btn btn-sm btn-primary" onClick={() => openWorkoutModal()}>
                Start Workout
              </button>
            )}
          </div>
        </div>
        <div className="section-body">
          {todayWorkoutEntry ? (
            exerciseGroups.length > 0 ? (
              <div className="exercise-cards">
                {exerciseGroups.map(g => {
                  const groupTuple = tupleForGroup(g);
                  const todayBest  = todayBestByExercise[g.name];
                  const allTimePR  = prMap[g.name];
                  const isBestOfDay = comparePRTuple(groupTuple, todayBest) === 0;
                  const beatsAllTime = allTimePR == null || comparePRTuple(todayBest, allTimePR) >= 0;
                  const isPR = isBestOfDay && beatsAllTime;
                  return (
                    <ExerciseCard
                      key={`${g.name}-${g.weight}`}
                      name={g.name}
                      weight={g.weight}
                      sets={g.sets}
                      isPR={isPR}
                      onEdit={() => setEditExercise({ sessionId: g.sets[0]._sessionId ?? todayWorkoutEntry.id, name: g.name, sets: g.sets })}
                    />
                  );
                })}
                {editableWorkoutSession && (
                  <button className="today-add-exercise-row" onClick={() => openWorkoutModal({ appendBlank: true })}>
                    + Add another exercise
                  </button>
                )}
              </div>
            ) : (
              <div className="today-workout-empty">
                <span className="muted">Session logged. No exercises yet.</span>
                {editableWorkoutSession && (
                  <button className="btn btn-sm btn-primary" onClick={() => openWorkoutModal({ appendBlank: true })}>
                    + Exercise
                  </button>
                )}
              </div>
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
                  Edit Day
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete({ title: 'Delete Nutrition Log', message: 'Are you sure you want to delete this nutrition log and all its meals?', onDelete: () => api.delete(`/nutrition/${todayNutritionEntry.id}`).then(refetchNutrition), onUndone: refetchNutrition })}>Delete</button>
              </>
            )}
            <button className="btn btn-sm btn-primary" onClick={openAddMeal} disabled={addingMeal}>
              + Add Meal
            </button>
          </div>
        </div>
        <div className="section-body">
          {todayNutritionEntry ? (
            <>
              <div className="nutrition-day-info">
                <DataRow label="Day Type" value={todayNutritionEntry.dayType} />
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

        </div>

        {/* Right column — muscle body map */}
        <div className="weekly-bodymap-col">
          <div className="section-box weekly-bodymap-section">
            <div className="section-header">
              <span className="section-title">Muscle Map</span>
              <span className="muted section-label-small">today</span>
            </div>
            <div className="section-body">
              <BodyMap
                muscleStats={muscleStats}
                onSelectMuscle={setSelectedMuscle}
                selectedMuscle={selectedMuscle}
              />
              <MuscleDetailPanel
                muscle={selectedMuscle}
                exercises={selectedMuscle ? (muscleStats[selectedMuscle]?.exercises ?? []) : []}
                periodLabel="today"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'weight' && (
        <WeightModal prefillDate={TODAY} existing={editingEntry} onClose={closeModal} onSaved={refetchWeight} />
      )}
      {modal === 'workout' && (
        <WorkoutBuilderModal
          prefillDate={TODAY}
          existingSession={todayWorkoutEntry ? editableWorkoutSession : null}
          appendBlankExercise={appendBlankExercise}
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
      {confirmDelete && (
        <ConfirmDeleteModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          onClose={() => setConfirmDelete(null)}
          onDelete={confirmDelete.onDelete}
          onUndone={() => { confirmDelete.onUndone(); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
