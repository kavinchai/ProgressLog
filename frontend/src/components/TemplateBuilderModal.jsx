import { useState } from 'react';
import api from '../api';
import Modal from './Modal';
import ExerciseListEditor, { exercisesToForm, exercisesToPayload } from './ExerciseListEditor';
import useWeightUnit from '../hooks/useWeightUnit';
import './WorkoutBuilderModal.css';

export default function TemplateBuilderModal({ template, onClose, onSaved }) {
  const isEdit = Boolean(template);
  const { unit } = useWeightUnit();

  const [name,      setName]      = useState(template?.name ?? '');
  const [exercises, setExercises] = useState(
    isEdit ? exercisesToForm(template.exercises, unit) : []
  );
  const [err,       setErr]       = useState('');
  const [saving,    setSaving]    = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        exercises: exercisesToPayload(exercises, unit),
      };
      if (isEdit) {
        await api.put(`/templates/${template.id}`, payload);
      } else {
        await api.post('/templates', payload);
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
    <Modal title={isEdit ? 'Edit Template' : 'New Template'} onClose={onClose}>
      <form className="wbm-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}

        <div className="modal-field">
          <label className="modal-label">Template Name</label>
          <input
            className="modal-input"
            type="text"
            placeholder="e.g. Push Day"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

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
