import { useState } from 'react';
import api from '../api';
import Modal from './Modal';
import './WorkoutBuilderModal.css';

function isCardio(sets) {
  return sets.some(s => s.distanceMiles != null || s.durationSeconds != null);
}

function secondsToMinSec(totalSeconds) {
  if (totalSeconds == null) return { mins: '', secs: '' };
  return { mins: String(Math.floor(totalSeconds / 60)), secs: String(totalSeconds % 60) };
}

/** exerciseSets: all SetDTO rows for one exercise name in a session */
export default function EditExerciseModal({ sessionId, exerciseName, exerciseSets, onClose, onSaved }) {
  const cardio = isCardio(exerciseSets);

  const initialSets = exerciseSets.map(s => {
    if (cardio) {
      const { mins, secs } = secondsToMinSec(s.durationSeconds);
      return {
        setNumber:     s.setNumber,
        distanceMiles: s.distanceMiles != null ? String(s.distanceMiles) : '',
        durationMins:  mins,
        durationSecs:  secs,
      };
    }
    return { setNumber: s.setNumber, reps: String(s.reps ?? ''), weightLbs: String(s.weightLbs ?? '') };
  });

  const [sets, setSets]     = useState(initialSets);
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);

  function removeSet(setIndex) {
    setSets(prev =>
      prev.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }))
    );
  }

  function updateSet(setIndex, field, val) {
    setSets(prev => prev.map((s, i) => i === setIndex ? { ...s, [field]: val } : s));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const mappedSets = cardio
        ? sets.map(s => {
            const totalSeconds = (parseInt(s.durationMins) || 0) * 60 + (parseInt(s.durationSecs) || 0);
            const set = { setNumber: s.setNumber, reps: 0, weightLbs: 0, durationSeconds: totalSeconds };
            if (s.distanceMiles !== '') set.distanceMiles = parseFloat(s.distanceMiles);
            return set;
          })
        : sets.map(s => ({
            setNumber: s.setNumber,
            reps:      parseInt(s.reps) || 0,
            weightLbs: parseFloat(s.weightLbs) || 0,
          }));

      await api.post('/workouts/' + sessionId + '/exercises', { exerciseName, sets: mappedSets });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteExercise() {
    setSaving(true);
    try {
      await api.delete('/workouts/' + sessionId + '/exercises', { params: { name: exerciseName } });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to delete.');
      setSaving(false);
    }
  }

  return (
    <Modal title={'Edit: ' + exerciseName} onClose={onClose}>
      <form className="wbm-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}

        <div className="wbm-sets">
          {cardio ? (
            <>
              <div className="wbm-sets-head">
                <span>Set</span>
                <span>Distance (mi)</span>
                <span>Duration (m:s)</span>
                <span></span>
              </div>
              {sets.map((s, setIndex) => (
                <div key={setIndex} className="wbm-set-row">
                  <span className="wbm-set-num">{s.setNumber}</span>
                  <input
                    className="modal-input wbm-set-input"
                    type="number" step="0.01" min="0"
                    placeholder="--"
                    value={s.distanceMiles}
                    onChange={e => updateSet(setIndex, 'distanceMiles', e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="modal-input wbm-set-input"
                      type="number" min="0" placeholder="min"
                      value={s.durationMins}
                      onChange={e => updateSet(setIndex, 'durationMins', e.target.value)}
                    />
                    <input
                      className="modal-input wbm-set-input"
                      type="number" min="0" max="59" placeholder="sec"
                      value={s.durationSecs}
                      onChange={e => updateSet(setIndex, 'durationSecs', e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => removeSet(setIndex)}>&times;</button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="wbm-sets-head">
                <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span></span>
              </div>
              {sets.map((s, setIndex) => (
                <div key={setIndex} className="wbm-set-row">
                  <span className="wbm-set-num">{s.setNumber}</span>
                  <input
                    className="modal-input wbm-set-input"
                    type="number" step="0.5" min="0"
                    value={s.weightLbs}
                    onChange={e => updateSet(setIndex, 'weightLbs', e.target.value)}
                  />
                  <input
                    className="modal-input wbm-set-input"
                    type="number" min="0"
                    value={s.reps}
                    onChange={e => updateSet(setIndex, 'reps', e.target.value)}
                  />
                  <button type="button" className="btn btn-sm" onClick={() => removeSet(setIndex)}>&times;</button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-sm btn-danger" onClick={deleteExercise} disabled={saving}>
            Delete Exercise
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
