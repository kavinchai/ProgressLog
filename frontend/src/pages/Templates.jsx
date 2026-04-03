import { useState } from 'react';
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

  async function handleDelete(template) {
    setDeleting(template.id);
    try {
      await api.delete(`/templates/${template.id}`);
      refetch();
    } finally {
      setDeleting(null);
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
        <button className="btn" onClick={() => setShowNew(true)}>[+ new template]</button>
      </div>

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
                <button className="btn btn-sm" onClick={() => setUseTemplate(t)}>[use]</button>
                <button className="btn btn-sm" onClick={() => setEditTemplate(t)}>[edit]</button>
                <button
                  className="btn btn-sm"
                  onClick={() => handleDelete(t)}
                  disabled={deleting === t.id}
                >
                  {deleting === t.id ? '[…]' : '[delete]'}
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
