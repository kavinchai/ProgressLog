import { useState } from 'react';
import api from '../api';
import Modal from './Modal';
import useWeightUnit from '../hooks/useWeightUnit';
import './WorkoutBuilderModal.css';

function detectType(sets) {
  const hasDist = (sets ?? []).some(s => s.distanceMiles != null);
  const hasDur  = (sets ?? []).some(s => s.durationSeconds != null);
  if (hasDist) return 'run';
  if (hasDur)  return 'timed';
  return 'lifting';
}

function splitDuration(totalSeconds) {
  if (totalSeconds == null) return { hours: '', mins: '', secs: '' };
  return {
    hours: String(Math.floor(totalSeconds / 3600)),
    mins:  String(Math.floor((totalSeconds % 3600) / 60)),
    secs:  String(totalSeconds % 60),
  };
}

/** exerciseSets: all SetDTO rows for one exercise name in a session */
export default function EditExerciseModal({ sessionId, exerciseName, exerciseSets, onClose, onSaved }) {
  const type = detectType(exerciseSets);
  const { unit, toDisplay, fromDisplay } = useWeightUnit();

  const initialSets = exerciseSets.map(s => {
    if (type === 'run') {
      const { mins, secs } = splitDuration(s.durationSeconds);
      return {
        setNumber:     s.setNumber,
        distanceMiles: s.distanceMiles != null ? String(s.distanceMiles) : '',
        durationMins:  mins,
        durationSecs:  secs,
      };
    }
    if (type === 'timed') {
      const { hours, mins, secs } = splitDuration(s.durationSeconds);
      return {
        setNumber:     s.setNumber,
        durationHours: hours,
        durationMins:  mins,
        durationSecs:  secs,
      };
    }
    return { setNumber: s.setNumber, reps: String(s.reps ?? ''), weightLbs: String(toDisplay(s.weightLbs) ?? '') };
  });

  const [sets, setSets]     = useState(initialSets);
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);

  function removeSet(setIndex) {
    setSets(prev =>
      prev.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }))
    );
  }

  function addSet() {
    setSets(prev => [...prev, { setNumber: prev.length + 1, reps: '', weightLbs: '' }]);
  }

  function updateSet(setIndex, field, val) {
    setSets(prev => prev.map((s, i) => i === setIndex ? { ...s, [field]: val } : s));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const mappedSets = sets.map(s => {
        if (type === 'run') {
          const totalSeconds = (parseInt(s.durationMins) || 0) * 60 + (parseInt(s.durationSecs) || 0);
          const set = { setNumber: s.setNumber, reps: 0, weightLbs: 0, durationSeconds: totalSeconds };
          if (s.distanceMiles !== '') set.distanceMiles = parseFloat(s.distanceMiles);
          return set;
        }
        if (type === 'timed') {
          const totalSeconds = (parseInt(s.durationHours) || 0) * 3600
            + (parseInt(s.durationMins) || 0) * 60
            + (parseInt(s.durationSecs) || 0);
          return { setNumber: s.setNumber, reps: 0, weightLbs: 0, durationSeconds: totalSeconds };
        }
        return {
          setNumber: s.setNumber,
          reps:      parseInt(s.reps) || 0,
          weightLbs: fromDisplay(s.weightLbs) || 0,
        };
      });

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

        <div className={`wbm-sets${type !== 'lifting' ? ' wbm-sets--cardio' : ''}`}>
          {type === 'run' ? (
            <>
              <div className="wbm-sets-head wbm-sets-head--cardio">
                <span>Distance (mi)</span><span>Min</span><span>Sec</span>
              </div>
              {sets.map((s, setIndex) => (
                <div key={setIndex} className="wbm-set-row wbm-set-row--cardio">
                  <input className="modal-input wbm-set-input" type="number"
                    step="0.01" min="0" placeholder="0"
                    value={s.distanceMiles}
                    onChange={e => updateSet(setIndex, 'distanceMiles', e.target.value)} />
                  <input className="modal-input wbm-set-input" type="number"
                    min="0" placeholder="0"
                    value={s.durationMins}
                    onChange={e => updateSet(setIndex, 'durationMins', e.target.value)} />
                  <input className="modal-input wbm-set-input" type="number"
                    min="0" max="59" placeholder="0"
                    value={s.durationSecs}
                    onChange={e => updateSet(setIndex, 'durationSecs', e.target.value)} />
                </div>
              ))}
            </>
          ) : type === 'timed' ? (
            <>
              <div className="wbm-sets-head wbm-sets-head--cardio">
                <span>Hr</span><span>Min</span><span>Sec</span>
              </div>
              {sets.map((s, setIndex) => (
                <div key={setIndex} className="wbm-set-row wbm-set-row--cardio">
                  <input className="modal-input wbm-set-input" type="number"
                    min="0" placeholder="0"
                    value={s.durationHours}
                    onChange={e => updateSet(setIndex, 'durationHours', e.target.value)} />
                  <input className="modal-input wbm-set-input" type="number"
                    min="0" max="59" placeholder="0"
                    value={s.durationMins}
                    onChange={e => updateSet(setIndex, 'durationMins', e.target.value)} />
                  <input className="modal-input wbm-set-input" type="number"
                    min="0" max="59" placeholder="0"
                    value={s.durationSecs}
                    onChange={e => updateSet(setIndex, 'durationSecs', e.target.value)} />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="wbm-sets-head">
                <span>Set</span><span>Weight ({unit})</span><span>Reps</span><span></span>
              </div>
              {sets.map((s, setIndex) => (
                <div key={setIndex} className="wbm-set-row">
                  <span className="wbm-set-num">{s.setNumber}</span>
                  <input className="modal-input wbm-set-input" type="number"
                    step="0.5" min="0"
                    value={s.weightLbs}
                    onChange={e => updateSet(setIndex, 'weightLbs', e.target.value)} />
                  <input className="modal-input wbm-set-input" type="number"
                    min="0"
                    value={s.reps}
                    onChange={e => updateSet(setIndex, 'reps', e.target.value)} />
                  <button type="button" className="btn btn-sm" onClick={() => removeSet(setIndex)}>&times;</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={addSet}>+ Set</button>
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
