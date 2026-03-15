import { useState, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import './Settings.css';

export default function Settings() {
  const { goals, loading, saving, error, saveGoals } = useUserProfile();
  const [form, setForm] = useState({ calorieTargetTraining: '', calorieTargetRest: '', proteinTarget: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        calorieTargetTraining: goals.calorieTargetTraining,
        calorieTargetRest:     goals.calorieTargetRest,
        proteinTarget:         goals.proteinTarget,
      });
    }
  }, [loading, goals]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaved(false);
    try {
      await saveGoals({
        calorieTargetTraining: parseInt(form.calorieTargetTraining, 10),
        calorieTargetRest:     parseInt(form.calorieTargetRest, 10),
        proteinTarget:         parseInt(form.proteinTarget, 10),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* error shown via hook */
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setSaved(false);
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-sub">Nutrition goals used across all stats pages</p>
      </div>

      {loading ? (
        <p className="settings-loading">Loading…</p>
      ) : (
        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-section-label">Calorie Targets</div>

          <div className="settings-field">
            <label htmlFor="calorieTargetTraining">Training Day</label>
            <div className="settings-input-row">
              <input
                id="calorieTargetTraining"
                name="calorieTargetTraining"
                type="number"
                min="1"
                value={form.calorieTargetTraining}
                onChange={handleChange}
                required
              />
              <span className="settings-unit">kcal</span>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="calorieTargetRest">Rest Day</label>
            <div className="settings-input-row">
              <input
                id="calorieTargetRest"
                name="calorieTargetRest"
                type="number"
                min="1"
                value={form.calorieTargetRest}
                onChange={handleChange}
                required
              />
              <span className="settings-unit">kcal</span>
            </div>
          </div>

          <div className="settings-section-label" style={{ marginTop: 24 }}>Protein Target</div>

          <div className="settings-field">
            <label htmlFor="proteinTarget">Daily Goal</label>
            <div className="settings-input-row">
              <input
                id="proteinTarget"
                name="proteinTarget"
                type="number"
                min="1"
                value={form.proteinTarget}
                onChange={handleChange}
                required
              />
              <span className="settings-unit">g</span>
            </div>
          </div>

          {error && <p className="settings-error">{error}</p>}

          <div className="settings-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? '[saving…]' : '[save goals]'}
            </button>
            {saved && <span className="settings-saved">saved.</span>}
          </div>
        </form>
      )}
    </div>
  );
}
