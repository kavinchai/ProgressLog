import { useState } from 'react';
import api from '../api';
import Modal from './Modal';
import './WorkoutBuilderModal.css';

const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function emptySet(num) {
  return { setNumber: num, reps: '', weightLbs: '' };
}

function emptyExercise() {
  return { exerciseName: '', sets: [emptySet(1)] };
}

export default function WorkoutBuilderModal({ prefillDate, onClose, onSaved }) {
  const [date,      setDate]      = useState(prefillDate ?? TODAY);
  const [exercises, setExercises] = useState([]);
  const [err,       setErr]       = useState('');
  const [saving,    setSaving]    = useState(false);

  // ── exercise mutations ────────────────────────────────────────────────────

  function addExercise() {
    setExercises(prev => [...prev, emptyExercise()]);
  }

  function removeExercise(exerciseIndex) {
    setExercises(prev => prev.filter((_, i) => i !== exerciseIndex));
  }

  function updateExerciseName(exerciseIndex, val) {
    setExercises(prev => prev.map((exercise, i) =>
      i === exerciseIndex ? { ...exercise, exerciseName: val } : exercise
    ));
  }

  function addSet(exerciseIndex) {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return { ...exercise, sets: [...exercise.sets, emptySet(exercise.sets.length + 1)] };
    }));
  }

  function removeSet(exerciseIndex, setIndex) {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const sets = exercise.sets
        .filter((_, j) => j !== setIndex)
        .map((s, j) => ({ ...s, setNumber: j + 1 }));
      return { ...exercise, sets };
    }));
  }

  function updateSet(exerciseIndex, setIndex, field, val) {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const sets = exercise.sets.map((s, j) =>
        j === setIndex ? { ...s, [field]: val } : s
      );
      return { ...exercise, sets };
    }));
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload = {
        sessionDate: date,
        exercises: exercises
          .filter(exercise => exercise.exerciseName.trim())
          .map(exercise => ({
            exerciseName: exercise.exerciseName.trim(),
            sets: exercise.sets.map(s => ({
              setNumber:  s.setNumber,
              reps:       parseInt(s.reps)      || 0,
              weightLbs:  parseFloat(s.weightLbs) || 0,
            })),
          })),
      };
      await api.post('/workouts', payload);
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Workout" onClose={onClose}>
      <form className="wbm-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}

        {/* Session fields */}
        <div className="modal-field">
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} required />
        </div>

        {/* Exercises */}
        {exercises.length > 0 && (
          <div className="wbm-exercises">
            {exercises.map((exercise, exerciseIndex) => (
              <div key={exerciseIndex} className="wbm-exercise-block">
                <div className="wbm-exercise-header">
                  <input
                    className="modal-input wbm-exercise-name"
                    type="text"
                    placeholder="Exercise name"
                    value={exercise.exerciseName}
                    onChange={e => updateExerciseName(exerciseIndex, e.target.value)}
                  />
                  <button type="button" className="btn btn-sm"
                    onClick={() => removeExercise(exerciseIndex)}>[x]</button>
                </div>

                {/* Sets */}
                <div className="wbm-sets">
                  <div className="wbm-sets-head">
                    <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span></span>
                  </div>
                  {exercise.sets.map((s, setIndex) => (
                    <div key={setIndex} className="wbm-set-row">
                      <span className="wbm-set-num">{s.setNumber}</span>
                      <input className="modal-input wbm-set-input" type="number"
                        step="0.5" min="0" placeholder="0"
                        value={s.weightLbs}
                        onChange={e => updateSet(exerciseIndex, setIndex, 'weightLbs', e.target.value)} />
                      <input className="modal-input wbm-set-input" type="number"
                        min="0" placeholder="0"
                        value={s.reps}
                        onChange={e => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)} />
                      <button type="button" className="btn btn-sm"
                        onClick={() => removeSet(exerciseIndex, setIndex)}>[x]</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-sm wbm-add-set"
                  onClick={() => addSet(exerciseIndex)}>
                  [+ set]
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-sm wbm-add-exercise"
          onClick={addExercise}>
          [+ add exercise]
        </button>

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
