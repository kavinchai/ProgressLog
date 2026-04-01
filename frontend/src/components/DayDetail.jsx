import { useState } from 'react';
import api from '../api';
import WeightModal from './WeightModal';
import DayInfoModal from './DayInfoModal';
import MealModal from './MealModal';
import WorkoutBuilderModal from './WorkoutBuilderModal';
import EditExerciseModal from './EditExerciseModal';
import { groupByExercise } from '../utils/workout';

export default function DayDetail({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo, showDelete = true }) {
  const [modal,        setModal]        = useState(null);
  const [editMeal,     setEditMeal]     = useState(null);
  const [mealLogId,    setMealLogId]    = useState(null);
  const [editExercise, setEditExercise] = useState(null);

  const exerciseGroups = workoutEntry?.exerciseSets?.length
    ? groupByExercise(workoutEntry.exerciseSets)
    : [];

  const meals = nutritionEntry?.meals ?? [];

  function close() { setModal(null); }

  async function deleteWeight() {
    if (!weightEntry) return;
    try { await api.delete(`/weight/${weightEntry.id}`); onRefetchW(); }
    catch { /* ignore */ }
  }

  async function deleteNutritionDay() {
    if (!nutritionEntry) return;
    try { await api.delete(`/nutrition/${nutritionEntry.id}`); onRefetchN(); }
    catch { /* ignore */ }
  }

  async function deleteWorkoutSession() {
    if (!workoutEntry) return;
    try { await api.delete(`/workouts/${workoutEntry.id}`); onRefetchWo(); }
    catch { /* ignore */ }
  }

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
              <>
                <button className="btn btn-sm" onClick={() => setModal('weight-edit')}>[edit]</button>
                {showDelete && <button className="btn btn-sm" onClick={deleteWeight}>[delete]</button>}
              </>
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
              <>
                <button className="btn btn-sm" onClick={() => setModal('dayinfo')}>[edit day info]</button>
                {showDelete && <button className="btn btn-sm" onClick={deleteNutritionDay}>[delete day]</button>}
              </>
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
            {showDelete && workoutEntry && (
              <button className="btn btn-sm" onClick={deleteWorkoutSession}>[delete session]</button>
            )}
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
