import { useState } from 'react';
import api from '../api';
import Modal from './Modal';

/**
 * Confirmation dialog for destructive actions with undo support.
 *
 * Props:
 *   title       – modal title (e.g. "Delete Weight Entry")
 *   message     – description shown to the user
 *   onClose     – called when the dialog is dismissed
 *   onDelete    – async fn that performs the actual delete; must return truthy on success
 *   onUndone    – called after a successful undo so callers can refetch
 */
export default function ConfirmDeleteModal({ title, message, onClose, onDelete, onUndone }) {
  const [phase, setPhase]     = useState('confirm'); // confirm | deleted | undoing | undone | error
  const [errMsg, setErrMsg]   = useState('');

  async function handleDelete() {
    setPhase('deleting');
    try {
      await onDelete();
      setPhase('deleted');
    } catch (ex) {
      setErrMsg(ex?.response?.data?.message ?? 'Delete failed.');
      setPhase('error');
    }
  }

  async function handleUndo() {
    setPhase('undoing');
    try {
      await api.post('/undo');
      setPhase('undone');
      if (onUndone) onUndone();
    } catch {
      setErrMsg('Undo failed.');
      setPhase('error');
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-delete-body">
        {phase === 'confirm' && (
          <>
            <p className="confirm-delete-msg">{message}</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-sm btn-danger" onClick={handleDelete}>Confirm Delete</button>
            </div>
          </>
        )}

        {phase === 'deleting' && (
          <p className="confirm-delete-msg">Deleting...</p>
        )}

        {phase === 'deleted' && (
          <>
            <p className="confirm-delete-msg">Deleted successfully.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>Done</button>
              <button className="btn btn-sm btn-primary" onClick={handleUndo}>Undo</button>
            </div>
          </>
        )}

        {phase === 'undoing' && (
          <p className="confirm-delete-msg">Restoring...</p>
        )}

        {phase === 'undone' && (
          <>
            <p className="confirm-delete-msg">Restored successfully!</p>
            <div className="modal-actions">
              <button className="btn btn-sm btn-primary" onClick={onClose}>OK</button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="modal-error">{errMsg}</p>
            <div className="modal-actions">
              <button className="btn btn-sm" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
