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

  function removeExercise(ei) {
    setExercises(prev => prev.filter((_, i) => i !== ei));
  }

  function updateExerciseName(ei, val) {
    setExercises(prev => prev.map((ex, i) =>
      i === ei ? { ...ex, exerciseName: val } : ex
    ));
  }

  function addSet(ei) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      return { ...ex, sets: [...ex.sets, emptySet(ex.sets.length + 1)] };
    }));
  }

  function removeSet(ei, si) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      const sets = ex.sets
        .filter((_, j) => j !== si)
        .map((s, j) => ({ ...s, setNumber: j + 1 }));
      return { ...ex, sets };
    }));
  }

  function updateSet(ei, si, field, val) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      const sets = ex.sets.map((s, j) =>
        j === si ? { ...s, [field]: val } : s
      );
      return { ...ex, sets };
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
          .filter(ex => ex.exerciseName.trim())
          .map(ex => ({
            exerciseName: ex.exerciseName.trim(),
            sets: ex.sets.map(s => ({
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
            {exercises.map((ex, ei) => (
              <div key={ei} className="wbm-exercise-block">
                <div className="wbm-exercise-header">
                  <input
                    className="modal-input wbm-exercise-name"
                    type="text"
                    placeholder="Exercise name"
                    value={ex.exerciseName}
                    onChange={e => updateExerciseName(ei, e.target.value)}
                  />
                  <button type="button" className="btn btn-sm"
                    onClick={() => removeExercise(ei)}>[x]</button>
                </div>

                {/* Sets */}
                <div className="wbm-sets">
                  <div className="wbm-sets-head">
                    <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span></span>
                  </div>
                  {ex.sets.map((s, si) => (
                    <div key={si} className="wbm-set-row">
                      <span className="wbm-set-num">{s.setNumber}</span>
                      <input className="modal-input wbm-set-input" type="number"
                        step="0.5" min="0" placeholder="0"
                        value={s.weightLbs}
                        onChange={e => updateSet(ei, si, 'weightLbs', e.target.value)} />
                      <input className="modal-input wbm-set-input" type="number"
                        min="0" placeholder="0"
                        value={s.reps}
                        onChange={e => updateSet(ei, si, 'reps', e.target.value)} />
                      <button type="button" className="btn btn-sm"
                        onClick={() => removeSet(ei, si)}>[x]</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-sm wbm-add-set"
                  onClick={() => addSet(ei)}>
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
