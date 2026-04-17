import { useState } from 'react';
import { useDayActions } from '../hooks/useDayActions';
import WeightModal from './WeightModal';
import DayInfoModal from './DayInfoModal';
import MealModal from './MealModal';
import WorkoutBuilderModal from './WorkoutBuilderModal';
import EditExerciseModal from './EditExerciseModal';
import { groupByExercise, isCardioExercise, formatDuration, calcPace } from '../utils/workout';

export default function DayDetail({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo, showDelete = true }) {
  const [modal,        setModal]        = useState(null);
  const [editMeal,     setEditMeal]     = useState(null);
  const [mealLogId,    setMealLogId]    = useState(null);
  const [editExercise, setEditExercise] = useState(null);

  const {
    renamingSession, setRenamingSession, renameValue, setRenameValue,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, getOrCreateNutritionLogId,
  } = useDayActions({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo });

  const exerciseGroups = workoutEntry?.exerciseSets?.length
    ? groupByExercise(workoutEntry.exerciseSets)
    : [];

  const meals = nutritionEntry?.meals ?? [];

  function close() { setModal(null); }

  async function openAddMeal() {
    const logId = await getOrCreateNutritionLogId();
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
              <>
                <button className="btn btn-sm" onClick={() => setModal('weight-edit')}>Edit</button>
                {showDelete && <button className="btn btn-sm btn-danger" onClick={deleteWeight}>Delete</button>}
              </>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => setModal('weight-add')}>+ Add</button>
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
              <>
                <button className="btn btn-sm" onClick={() => setModal('dayinfo')}>Edit Day</button>
                {showDelete && <button className="btn btn-sm btn-danger" onClick={deleteNutritionDay}>Delete</button>}
              </>
            )}
            <button className="btn btn-sm btn-primary" onClick={openAddMeal}>+ Meal</button>
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
                        Edit
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
          <span className="day-detail-label">
            Workout
            {workoutEntry?.sessionName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: '0.85em' }}>
                {workoutEntry.sessionName}
              </span>
            )}
          </span>
          <div className="btn-actions">
            {workoutEntry && !renamingSession && (
              <button className="btn btn-sm" onClick={() => { setRenameValue(workoutEntry.sessionName ?? ''); setRenamingSession(true); }}>Rename</button>
            )}
            {renamingSession && (
              <>
                <input
                  className="modal-input"
                  style={{ width: 120, padding: '2px 6px' }}
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
            {showDelete && workoutEntry && (
              <button className="btn btn-sm btn-danger" onClick={deleteWorkoutSession}>Delete</button>
            )}
            <button className="btn btn-sm btn-primary" onClick={() => setModal('workout-add')}>+ Add</button>
          </div>
        </div>
        {workoutEntry ? (
          exerciseGroups.length > 0 ? (
            <div className="day-exercise-list">
              {exerciseGroups.map(g => (
                <div key={`${g.name}-${g.weight}`} className="day-exercise-item">
                  <div className="day-exercise-row">
                    <span className="day-exercise-name">{g.name}</span>
                    {!isCardioExercise(g.name) && g.weight != null && (
                      <span className="muted">{g.weight} lbs</span>
                    )}
                    <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => setEditExercise({ sessionId: workoutEntry.id, name: g.name, sets: g.sets })}>
                      Edit
                    </button>
                  </div>
                  <div className="day-exercise-reps">
                    {isCardioExercise(g.name)
                      ? g.sets.map(s =>
                          `${s.distanceMiles ?? '--'} mi / ${formatDuration(s.durationSeconds)}${calcPace(s.distanceMiles, s.durationSeconds) ? ` (${calcPace(s.distanceMiles, s.durationSeconds)})` : ''}`
                        ).join('  ')
                      : g.sets.map(s => s.reps ?? '--').join('  ')
                    }
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
