import { useState, useRef } from 'react';
import api from '../api';
import useTemplates from '../hooks/useTemplates';
import TemplateBuilderModal from '../components/TemplateBuilderModal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import { localDateStr } from '../utils/date';
import './Templates.css';

const TODAY = localDateStr(new Date());

export default function Templates() {
  const { data: templates, loading, refetch } = useTemplates();

  const [showNew,       setShowNew]       = useState(false);
  const [editTemplate,  setEditTemplate]  = useState(null);
  const [useTemplate,   setUseTemplate]   = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [importing,     setImporting]     = useState(false);
  const [importError,   setImportError]   = useState('');
  const fileInputRef = useRef(null);

  async function handleDelete(template) {
    setDeleting(template.id);
    try {
      await api.delete(`/templates/${template.id}`);
      refetch();
    } finally {
      setDeleting(null);
    }
  }

  function handleExport() {
    const list = templates ?? [];
    // Strip server-assigned ids so the file is clean for re-import
    const exportData = list.map(({ name, exercises }) => ({ name, exercises }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'workout-templates.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError('');
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array of templates.');
      await api.post('/templates/import', parsed);
      refetch();
    } catch (err) {
      setImportError(err.response?.data?.message ?? err.message ?? 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  const list = templates ?? [];

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h1 className="templates-title">Templates</h1>
          <p className="templates-sub">Saved workout templates you can load when logging</p>
        </div>
        <div className="templates-header-actions">
          <button className="btn btn-sm btn-primary" onClick={() => setShowNew(true)}>+ New</button>
          <button className="btn btn-sm" onClick={handleExport} disabled={list.length === 0}>Export</button>
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </div>
      {importError && <p className="templates-error">{importError}</p>}

      {loading && <p className="templates-empty">Loading…</p>}

      {!loading && list.length === 0 && (
        <p className="templates-empty">
          No templates yet. Create one to speed up workout logging.
        </p>
      )}

      {!loading && list.length > 0 && (
        <div className="templates-list">
          {list.map(t => (
            <div key={t.id} className="template-card">
              <div className="template-card-body">
                <span className="template-card-name">{t.name}</span>
                <span className="template-card-exercises">
                  {(t.exercises ?? []).length === 0
                    ? 'No exercises'
                    : (t.exercises ?? []).map(e => e.exerciseName).join(', ')}
                </span>
              </div>
              <div className="template-card-actions">
                <button className="btn btn-sm btn-primary" onClick={() => setUseTemplate(t)}>Use</button>
                <button className="btn btn-sm" onClick={() => setEditTemplate(t)}>Edit</button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(t)}
                  disabled={deleting === t.id}
                >
                  {deleting === t.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <TemplateBuilderModal
          onClose={() => setShowNew(false)}
          onSaved={refetch}
        />
      )}

      {editTemplate && (
        <TemplateBuilderModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => { setEditTemplate(null); refetch(); }}
        />
      )}

      {useTemplate && (
        <WorkoutBuilderModal
          prefillDate={TODAY}
          prefillExercises={useTemplate.exercises}
          onClose={() => setUseTemplate(null)}
          onSaved={() => setUseTemplate(null)}
        />
      )}
    </div>
  );
}
