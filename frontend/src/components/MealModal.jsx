import { useState } from 'react';
import api from '../api';
import Modal from './Modal';

export default function MealModal({ logId, existing, onClose, onSaved }) {
  const [name,     setName]     = useState(existing?.mealName ?? '');
  const [calories, setCalories] = useState(existing?.calories ?? '');
  const [protein,  setProtein]  = useState(existing?.proteinGrams ?? '');
  const [err,      setErr]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deletePhase, setDeletePhase] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const body = {
        mealName: name.trim() || null,
        calories: parseInt(calories),
        proteinGrams: parseInt(protein),
      };
      if (existing) {
        await api.put(`/nutrition/${logId}/meals/${existing.id}`, body);
      } else {
        await api.post(`/nutrition/${logId}/meals`, body);
      }
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function deleteMeal() {
    if (!existing) return;
    setSaving(true);
    try {
      await api.delete(`/nutrition/${logId}/meals/${existing.id}`);
      onSaved();
      setDeletePhase('deleted');
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to delete.');
      setDeletePhase(null);
    } finally { setSaving(false); }
  }

  async function handleUndo() {
    setDeletePhase('undoing');
    try {
      await api.post('/undo');
      onSaved();
      setDeletePhase('undone');
    } catch {
      setErr('Undo failed.');
      setDeletePhase('deleted');
    }
  }

  return (
    <Modal title={existing ? 'Edit Meal' : 'Add Meal'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Meal Name</label>
          <input className="modal-input" type="text" placeholder="optional"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="modal-form-row">
          <div className="modal-field">
            <label className="modal-label">Calories</label>
            <input className="modal-input" type="number" min="0"
              value={calories} onChange={e => setCalories(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">Protein (g)</label>
            <input className="modal-input" type="number" min="0"
              value={protein} onChange={e => setProtein(e.target.value)} required />
          </div>
        </div>
        {!deletePhase && (
          <div className="modal-actions">
            {existing && (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeletePhase('confirm')} disabled={saving}>
                Delete
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
        {deletePhase === 'confirm' && (
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)' }}>Delete this meal?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setDeletePhase(null)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={deleteMeal} disabled={saving}>Confirm Delete</button>
            </div>
          </div>
        )}
        {deletePhase === 'deleted' && (
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--fs-sm)' }}>Meal deleted.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Done</button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleUndo}>Undo</button>
            </div>
          </div>
        )}
        {deletePhase === 'undoing' && (
          <div className="modal-actions">
            <span style={{ fontSize: 'var(--fs-sm)' }}>Restoring...</span>
          </div>
        )}
        {deletePhase === 'undone' && (
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--success)' }}>Restored!</span>
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>OK</button>
          </div>
        )}
      </form>
    </Modal>
  );
}
