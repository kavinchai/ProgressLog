import { useState, useEffect } from 'react';
import api from '../api';
import useWeightUnit, { toDisplay, fromDisplay } from '../hooks/useWeightUnit';

export function emptySet(num) {
  return { setNumber: num, reps: '', weightLbs: '', distanceMiles: '', durationHours: '', durationMinutes: '', durationSeconds: '' };
}

export function emptyExercise() {
  return { exerciseName: '', type: 'lifting', sets: [emptySet(1)] };
}

function detectType(sets) {
  const hasDist = (sets ?? []).some(s => s.distanceMiles != null);
  const hasDur  = (sets ?? []).some(s => s.durationSeconds != null);
  if (hasDist) return 'run';
  if (hasDur)  return 'timed';
  return 'lifting';
}

export function exercisesToForm(exercises, unit = 'lbs') {
  return (exercises ?? []).map(ex => ({
    exerciseName: ex.exerciseName,
    type: detectType(ex.sets),
    sets: (ex.sets ?? []).map(s => ({
      setNumber:       s.setNumber,
      reps:            String(s.reps),
      weightLbs:       String(toDisplay(s.weightLbs, unit) ?? ''),
      distanceMiles:   s.distanceMiles != null ? String(s.distanceMiles) : '',
      durationHours:   s.durationSeconds != null ? String(Math.floor(s.durationSeconds / 3600)) : '',
      durationMinutes: s.durationSeconds != null ? String(Math.floor((s.durationSeconds % 3600) / 60)) : '',
      durationSeconds: s.durationSeconds != null ? String(s.durationSeconds % 60) : '',
    })),
  }));
}

export function exercisesToPayload(exercises, unit = 'lbs') {
  return exercises
    .filter(ex => ex.exerciseName.trim())
    .map(ex => ({
      exerciseName: ex.exerciseName.trim(),
      sets: ex.sets.map(s => {
        const base = { setNumber: s.setNumber, reps: parseInt(s.reps) || 0, weightLbs: fromDisplay(s.weightLbs, unit) || 0 };
        if (ex.type === 'run') {
          const mins = parseInt(s.durationMinutes) || 0;
          const secs = parseInt(s.durationSeconds) || 0;
          base.distanceMiles   = parseFloat(s.distanceMiles) || null;
          base.durationSeconds = (mins * 60 + secs) || null;
        } else if (ex.type === 'timed') {
          const hours = parseInt(s.durationHours) || 0;
          const mins  = parseInt(s.durationMinutes) || 0;
          const secs  = parseInt(s.durationSeconds) || 0;
          base.durationSeconds = (hours * 3600 + mins * 60 + secs) || null;
        }
        return base;
      }),
    }));
}

export default function ExerciseListEditor({ exercises, onChange }) {
  const { unit } = useWeightUnit();
  const [knownNames,     setKnownNames]     = useState([]);
  const [suggestionFor,  setSuggestionFor]  = useState(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  useEffect(() => {
    api.get('/workouts/exercise-names').then(res => setKnownNames(res.data)).catch(() => {});
  }, []);

  function getFilteredSuggestions(value) {
    if (!value.trim()) return [];
    const lower = value.toLowerCase();
    return knownNames.filter(n => n.toLowerCase().includes(lower)).slice(0, 8);
  }

  function selectSuggestion(exerciseIndex, name) {
    updateExerciseName(exerciseIndex, name);
    setSuggestionFor(null);
    setHighlightedIdx(-1);
  }

  function handleNameKeyDown(e, exerciseIndex) {
    if (suggestionFor !== exerciseIndex) return;
    const filtered = getFilteredSuggestions(exercises[exerciseIndex].exerciseName);
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      selectSuggestion(exerciseIndex, filtered[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setSuggestionFor(null);
    }
  }

  function updateExerciseName(exerciseIndex, val) {
    onChange(exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, exerciseName: val } : ex
    ));
  }

  function addExercise() {
    onChange([...exercises, emptyExercise()]);
  }

  function addRun() {
    onChange([...exercises, { exerciseName: 'Run', type: 'run', sets: [emptySet(1)] }]);
  }

  function addTimed() {
    onChange([...exercises, { exerciseName: '', type: 'timed', sets: [emptySet(1)] }]);
  }

  function toggleType(exerciseIndex) {
    onChange(exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const next = ex.type === 'lifting' ? 'timed' : 'lifting';
      return { ...ex, type: next };
    }));
  }

  function removeExercise(exerciseIndex) {
    onChange(exercises.filter((_, i) => i !== exerciseIndex));
  }

  function addSet(exerciseIndex) {
    onChange(exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return { ...ex, sets: [...ex.sets, emptySet(ex.sets.length + 1)] };
    }));
  }

  function removeSet(exerciseIndex, setIndex) {
    onChange(exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const sets = ex.sets
        .filter((_, j) => j !== setIndex)
        .map((s, j) => ({ ...s, setNumber: j + 1 }));
      return { ...ex, sets };
    }));
  }

  function updateSet(exerciseIndex, setIndex, field, val) {
    onChange(exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const sets = ex.sets.map((s, j) =>
        j === setIndex ? { ...s, [field]: val } : s
      );
      return { ...ex, sets };
    }));
  }

  return (
    <>
      {exercises.length > 0 && (
        <div className="wbm-exercises">
          {exercises.map((ex, exerciseIndex) => (
            <div key={exerciseIndex} className="wbm-exercise-block">
              <div className="wbm-exercise-header">
                <div className="wbm-name-wrapper">
                  <input
                    className="modal-input wbm-exercise-name"
                    type="text"
                    placeholder="Exercise name"
                    value={ex.exerciseName}
                    onChange={e => {
                      updateExerciseName(exerciseIndex, e.target.value);
                      setSuggestionFor(exerciseIndex);
                      setHighlightedIdx(-1);
                    }}
                    onFocus={() => setSuggestionFor(exerciseIndex)}
                    onBlur={() => setTimeout(() => setSuggestionFor(null), 150)}
                    onKeyDown={e => handleNameKeyDown(e, exerciseIndex)}
                    autoComplete="off"
                  />
                  {suggestionFor === exerciseIndex &&
                    getFilteredSuggestions(ex.exerciseName).length > 0 && (
                    <ul className="wbm-suggestions">
                      {getFilteredSuggestions(ex.exerciseName).map((name, i) => (
                        <li
                          key={name}
                          className={`wbm-suggestion${i === highlightedIdx ? ' wbm-suggestion--active' : ''}`}
                          onMouseDown={() => selectSuggestion(exerciseIndex, name)}
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {ex.type !== 'run' && (
                  <button
                    type="button"
                    className={`btn btn-sm wbm-type-toggle${ex.type === 'timed' ? ' wbm-type-toggle--timed' : ''}`}
                    onClick={() => toggleType(exerciseIndex)}
                  >
                    {ex.type === 'timed' ? 'Timed' : 'Lifting'}
                  </button>
                )}
                <button type="button" className="btn btn-sm"
                  onClick={() => removeExercise(exerciseIndex)}>&times;</button>
              </div>

              <div className={`wbm-sets${ex.type !== 'lifting' ? ' wbm-sets--cardio' : ''}`}>
                {ex.type === 'run' ? (
                  <>
                    <div className="wbm-sets-head wbm-sets-head--cardio">
                      <span>Distance (mi)</span><span>Min</span><span>Sec</span>
                    </div>
                    {ex.sets.slice(0, 1).map((s, setIndex) => (
                      <div key={setIndex} className="wbm-set-row wbm-set-row--cardio">
                        <input className="modal-input wbm-set-input" type="number"
                          step="0.01" min="0" placeholder="0"
                          value={s.distanceMiles}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'distanceMiles', e.target.value)} />
                        <input className="modal-input wbm-set-input" type="number"
                          min="0" placeholder="0"
                          value={s.durationMinutes}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'durationMinutes', e.target.value)} />
                        <input className="modal-input wbm-set-input" type="number"
                          min="0" max="59" placeholder="0"
                          value={s.durationSeconds}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'durationSeconds', e.target.value)} />
                      </div>
                    ))}
                  </>
                ) : ex.type === 'timed' ? (
                  <>
                    <div className="wbm-sets-head wbm-sets-head--cardio">
                      <span>Hr</span><span>Min</span><span>Sec</span>
                    </div>
                    {ex.sets.slice(0, 1).map((s, setIndex) => (
                      <div key={setIndex} className="wbm-set-row wbm-set-row--cardio">
                        <input className="modal-input wbm-set-input" type="number"
                          min="0" placeholder="0"
                          value={s.durationHours}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'durationHours', e.target.value)} />
                        <input className="modal-input wbm-set-input" type="number"
                          min="0" max="59" placeholder="0"
                          value={s.durationMinutes}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'durationMinutes', e.target.value)} />
                        <input className="modal-input wbm-set-input" type="number"
                          min="0" max="59" placeholder="0"
                          value={s.durationSeconds}
                          onChange={e => updateSet(exerciseIndex, setIndex, 'durationSeconds', e.target.value)} />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="wbm-sets-head">
                      <span>Set</span><span>Weight ({unit})</span><span>Reps</span><span></span>
                    </div>
                    {ex.sets.map((s, setIndex) => (
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
                          onClick={() => removeSet(exerciseIndex, setIndex)}>&times;</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {ex.type === 'lifting' && (
                <button type="button" className="btn btn-sm wbm-add-set"
                  onClick={() => addSet(exerciseIndex)}>
                  + Set
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="wbm-add-buttons">
        <button type="button" className="btn btn-sm wbm-add-exercise" onClick={addExercise}>
          + Exercise
        </button>
        <button type="button" className="btn btn-sm wbm-add-exercise" onClick={addRun}>
          + Run
        </button>
        <button type="button" className="btn btn-sm wbm-add-exercise" onClick={addTimed}>
          + Timed
        </button>
      </div>
    </>
  );
}
