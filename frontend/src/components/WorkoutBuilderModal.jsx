import { useState, useEffect } from 'react';
import api from '../api';
import Modal from './Modal';
import ExerciseListEditor, {
  emptyExercise,
  exercisesToForm,
  exercisesToPayload,
} from './ExerciseListEditor';
import useWeightUnit from '../hooks/useWeightUnit';
import './WorkoutBuilderModal.css';

const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function setsToExercises(exerciseSets) {
  const byName = new Map();
  for (const set of (exerciseSets ?? [])) {
    const name = set.exerciseName ?? '';
    if (!byName.has(name)) byName.set(name, { exerciseName: name, sets: [] });
    byName.get(name).sets.push(set);
  }
  return Array.from(byName.values()).map(exercise => ({
    ...exercise,
    sets: [...exercise.sets].sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0)),
  }));
}

function buildInitialExercises(existingSession, prefillExercises, appendBlankExercise, unit) {
  const base = existingSession
    ? exercisesToForm(setsToExercises(existingSession.exerciseSets), unit)
    : [];
  const prefill = prefillExercises ? exercisesToForm(prefillExercises, unit) : [];
  const exercises = existingSession ? [...base, ...prefill] : prefill;
  return appendBlankExercise ? [...exercises, emptyExercise()] : exercises;
}

export default function WorkoutBuilderModal({
  prefillDate,
  prefillExercises,
  existingSession,
  appendBlankExercise = false,
  onClose,
  onSaved,
}) {
  const { unit } = useWeightUnit();
  const isEditing = Boolean(existingSession?.id);
  const [date,             setDate]             = useState(existingSession?.sessionDate ?? prefillDate ?? TODAY);
  const [sessionName,      setSessionName]      = useState(existingSession?.sessionName ?? '');
  const [exercises,        setExercises]        = useState(
    () => buildInitialExercises(existingSession, prefillExercises, appendBlankExercise, unit)
  );
  const [templates,        setTemplates]        = useState([]);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [err,              setErr]              = useState('');
  const [saving,           setSaving]           = useState(false);

  useEffect(() => {
    api.get('/templates').then(res => setTemplates(res.data)).catch(() => {});
  }, []);

  function loadTemplate(template) {
    const templateExercises = exercisesToForm(template.exercises, unit);
    setExercises(prev => isEditing ? [...prev, ...templateExercises] : templateExercises);
    setTemplateMenuOpen(false);
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload = {
        sessionDate: date,
        sessionName: sessionName.trim() || null,
        exercises: exercisesToPayload(exercises, unit),
      };
      if (isEditing) {
        await api.put(`/workouts/${existingSession.id}`, payload);
      } else {
        await api.post('/workouts', payload);
      }
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Workout' : 'Log Workout'} onClose={onClose}>
      <form className="wbm-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}

        <div className="modal-field">
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} required />
        </div>

        <div className="modal-field">
          <label className="modal-label">Session Name</label>
          <input className="modal-input" type="text" placeholder="e.g. Push, Pull, Legs"
            value={sessionName} onChange={e => setSessionName(e.target.value)} />
        </div>

        {templates.length > 0 && (
          <div className="wbm-template-row">
            <div className="wbm-name-wrapper" style={{ flex: 'unset' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setTemplateMenuOpen(o => !o)}
                onBlur={() => setTimeout(() => setTemplateMenuOpen(false), 150)}
              >
                {isEditing ? 'Add Template' : 'Load Template'}
              </button>
              {templateMenuOpen && (
                <ul className="wbm-suggestions wbm-template-list">
                  {templates.map(t => (
                    <li
                      key={t.id}
                      className="wbm-suggestion"
                      onMouseDown={() => loadTemplate(t)}
                    >
                      {t.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <ExerciseListEditor exercises={exercises} onChange={setExercises} />

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
