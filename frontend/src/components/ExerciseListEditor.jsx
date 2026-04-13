import { useState, useEffect } from 'react';
import api from '../api';

export function emptySet(num) {
  return { setNumber: num, reps: '', weightLbs: '' };
}

export function emptyExercise() {
  return { exerciseName: '', sets: [emptySet(1)] };
}

export function exercisesToForm(exercises) {
  return (exercises ?? []).map(ex => ({
    exerciseName: ex.exerciseName,
    sets: (ex.sets ?? []).map(s => ({
      setNumber:  s.setNumber,
      reps:       String(s.reps),
      weightLbs:  String(s.weightLbs),
    })),
  }));
}

export function exercisesToPayload(exercises) {
  return exercises
    .filter(ex => ex.exerciseName.trim())
    .map(ex => ({
      exerciseName: ex.exerciseName.trim(),
      sets: ex.sets.map(s => ({
        setNumber:  s.setNumber,
        reps:       parseInt(s.reps)       || 0,
        weightLbs:  parseFloat(s.weightLbs) || 0,
      })),
    }));
}

export default function ExerciseListEditor({ exercises, onChange }) {
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
                <button type="button" className="btn btn-sm"
                  onClick={() => removeExercise(exerciseIndex)}>[x]</button>
              </div>

              <div className="wbm-sets">
                <div className="wbm-sets-head">
                  <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span></span>
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

      <button type="button" className="btn btn-sm wbm-add-exercise" onClick={addExercise}>
        [+ add exercise]
      </button>
    </>
  );
}
