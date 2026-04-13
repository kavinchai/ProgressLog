import { useState, useEffect } from 'react';
import api from '../api';
import Modal from './Modal';
import ExerciseListEditor, { exercisesToForm, exercisesToPayload } from './ExerciseListEditor';
import './WorkoutBuilderModal.css';

const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export default function WorkoutBuilderModal({ prefillDate, prefillExercises, onClose, onSaved }) {
  const [date,             setDate]             = useState(prefillDate ?? TODAY);
  const [sessionName,      setSessionName]      = useState('');
  const [exercises,        setExercises]        = useState(
    prefillExercises ? exercisesToForm(prefillExercises) : []
  );
  const [templates,        setTemplates]        = useState([]);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [err,              setErr]              = useState('');
  const [saving,           setSaving]           = useState(false);

  useEffect(() => {
    api.get('/templates').then(res => setTemplates(res.data)).catch(() => {});
  }, []);

  function loadTemplate(template) {
    setExercises(exercisesToForm(template.exercises));
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
        exercises: exercisesToPayload(exercises),
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
                [load template]
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
