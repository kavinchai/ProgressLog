import { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../api';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import Modal from '../components/Modal';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import EditExerciseModal   from '../components/EditExerciseModal';
import './WeeklyStats.css';
import './TotalStats.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return parseInt(m) + '/' + parseInt(d) + '/' + y.slice(2);
}

function avg(nums) {
  const valid = nums.filter(n => n != null);
  if (!valid.length) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function groupByExercise(exerciseSets) {
  const map = {};
  for (const s of (exerciseSets ?? [])) {
    if (!map[s.exerciseName]) map[s.exerciseName] = [];
    map[s.exerciseName].push(s);
  }
  return Object.entries(map).map(([name, sets]) => ({
    name,
    sets: sets.sort((a, b) => a.setNumber - b.setNumber),
  }));
}

// ── Weight modal ──────────────────────────────────────────────────────────────

function WeightModal({ prefillDate, existing, onClose, onSaved }) {
  const [date,   setDate]   = useState(existing?.logDate ?? prefillDate ?? '');
  const [weight, setWeight] = useState(existing?.weightLbs ?? '');
  const [err,    setErr]    = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api.post('/weight', { logDate: date, weightLbs: parseFloat(weight) });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Weight' : 'Log Weight'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="modal-field">
          <label className="modal-label">Weight (lbs)</label>
          <input className="modal-input" type="number" step="0.1" min="0"
            value={weight} onChange={e => setWeight(e.target.value)} required />
        </div>
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

// ── Day info modal ────────────────────────────────────────────────────────────

function DayInfoModal({ prefillDate, existing, onClose, onSaved }) {
  const [type,  setType]  = useState(existing?.dayType ?? 'training');
  const [steps, setSteps] = useState(existing?.steps ?? '');
  const [err,   setErr]   = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api.post('/nutrition', {
        logDate: existing?.logDate ?? prefillDate,
        dayType: type,
        steps: steps ? parseInt(steps) : null,
      });
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Day Info" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {err && <div className="modal-error">{err}</div>}
        <div className="modal-field">
          <label className="modal-label">Day Type</label>
          <select className="modal-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="training">training</option>
            <option value="rest">rest</option>
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Steps</label>
          <input className="modal-input" type="number" min="0"
            value={steps} onChange={e => setSteps(e.target.value)} placeholder="optional" />
        </div>
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

// ── Meal modal ────────────────────────────────────────────────────────────────

function MealModal({ logId, existing, onClose, onSaved }) {
  const [name,   setName]   = useState(existing?.mealName ?? '');
  const [cal,    setCal]    = useState(existing?.calories ?? '');
  const [prot,   setProt]   = useState(existing?.proteinGrams ?? '');
  const [err,    setErr]    = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const body = {
        mealName: name.trim() || null,
        calories: parseInt(cal),
        proteinGrams: parseInt(prot),
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
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message ?? 'Failed to delete.');
    } finally { setSaving(false); }
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
              value={cal} onChange={e => setCal(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">Protein (g)</label>
            <input className="modal-input" type="number" min="0"
              value={prot} onChange={e => setProt(e.target.value)} required />
          </div>
        </div>
        <div className="modal-actions">
          {existing && (
            <button type="button" className="btn-ghost" onClick={deleteMeal} disabled={saving}>
              [delete]
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayDetail({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo }) {
  const [modal,        setModal]        = useState(null);
  const [editMeal,     setEditMeal]     = useState(null);
  const [mealLogId,    setMealLogId]    = useState(null);
  const [editExercise, setEditExercise] = useState(null);

  const exerciseGroups = workoutEntry?.exerciseSets?.length
    ? groupByExercise(workoutEntry.exerciseSets)
    : [];

  const meals = nutritionEntry?.meals ?? [];

  function close() { setModal(null); }

  async function openAddMeal() {
    let logId = nutritionEntry?.id;
    if (!logId) {
      try {
        const res = await api.post('/nutrition', { logDate: date, dayType: 'training', steps: null });
        logId = res.data?.id;
        onRefetchN();
      } catch { /* ignore */ }
    }
    setMealLogId(logId);
    setEditMeal(null);
    setModal('meal');
  }

  return (
    <div className="day-detail">

      {/* Weight */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Weight</span>
          <div className="btn-actions">
            {weightEntry ? (
              <button className="btn btn-sm" onClick={() => setModal('weight-edit')}>[edit]</button>
            ) : (
              <button className="btn btn-sm" onClick={() => setModal('weight-add')}>[+ add]</button>
            )}
          </div>
        </div>
        <div className="day-detail-value">
          {weightEntry ? weightEntry.weightLbs + ' lbs' : <span className="muted">--</span>}
        </div>
      </div>

      {/* Nutrition */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Nutrition</span>
          <div className="btn-actions">
            {nutritionEntry && (
              <button className="btn btn-sm" onClick={() => setModal('dayinfo')}>[edit day info]</button>
            )}
            <button className="btn btn-sm" onClick={openAddMeal}>[+ add meal]</button>
          </div>
        </div>
        {nutritionEntry ? (
          <div>
            <div className="day-detail-value">
              {nutritionEntry.dayType}{nutritionEntry.steps != null ? ' / ' + nutritionEntry.steps.toLocaleString() + ' steps' : ''}
            </div>
            {meals.length > 0 && (
              <>
                <div className="day-meal-list">
                  {meals.map((meal, i) => (
                    <div key={meal.id} className="day-meal-row">
                      <span className="day-meal-name">{meal.mealName || `Meal ${i + 1}`}</span>
                      <span className="muted">{meal.calories} kcal / {meal.proteinGrams}g</span>
                      <button className="btn btn-sm"
                        onClick={() => { setMealLogId(nutritionEntry.id); setEditMeal(meal); setModal('meal'); }}>
                        [edit]
                      </button>
                    </div>
                  ))}
                </div>
                <div className="day-nutrition-total">
                  Total: {nutritionEntry.totalCalories ?? 0} kcal / {nutritionEntry.totalProtein ?? 0}g protein
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="day-detail-value"><span className="muted">--</span></div>
        )}
      </div>

      {/* Workout */}
      <div className="day-detail-section">
        <div className="day-detail-section-head">
          <span className="day-detail-label">Workout</span>
          <div className="btn-actions">
            <button className="btn btn-sm" onClick={() => setModal('workout-add')}>[+ add]</button>
          </div>
        </div>
        {workoutEntry ? (
          exerciseGroups.length > 0 ? (
            <div className="day-exercise-list">
              {exerciseGroups.map(g => (
                <div key={g.name} className="day-exercise-item">
                  <div className="day-exercise-row">
                    <span className="day-exercise-name">{g.name}</span>
                    {g.sets[0]?.weightLbs != null && (
                      <span className="muted">{parseFloat(g.sets[0].weightLbs)} lbs</span>
                    )}
                    <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => setEditExercise({ sessionId: workoutEntry.id, name: g.name, sets: g.sets })}>
                      [edit]
                    </button>
                  </div>
                  <div className="day-exercise-reps">
                    {g.sets.map(s => s.reps ?? '--').join('  ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="day-detail-value"><span className="muted">session logged</span></div>
          )
        ) : (
          <div className="day-detail-value"><span className="muted">--</span></div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'weight-add' || modal === 'weight-edit') && (
        <WeightModal
          prefillDate={date}
          existing={modal === 'weight-edit' ? weightEntry : null}
          onClose={close}
          onSaved={onRefetchW}
        />
      )}
      {modal === 'dayinfo' && (
        <DayInfoModal
          prefillDate={date}
          existing={nutritionEntry}
          onClose={close}
          onSaved={onRefetchN}
        />
      )}
      {modal === 'meal' && (
        <MealModal
          logId={mealLogId}
          existing={editMeal}
          onClose={() => { setModal(null); setEditMeal(null); setMealLogId(null); }}
          onSaved={onRefetchN}
        />
      )}
      {modal === 'workout-add' && (
        <WorkoutBuilderModal
          prefillDate={date}
          onClose={close}
          onSaved={onRefetchWo}
        />
      )}
      {editExercise && (
        <EditExerciseModal
          sessionId={editExercise.sessionId}
          exerciseName={editExercise.name}
          exerciseSets={editExercise.sets}
          onClose={() => setEditExercise(null)}
          onSaved={onRefetchWo}
        />
      )}
    </div>
  );
}

// ── Weight line chart ─────────────────────────────────────────────────────────

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value} lbs</div>
    </div>
  );
}

function WeightLineChart({ dates, weights }) {
  const data = dates.map((date, i) => ({ label: formatDate(date), weight: weights[i] }))
    .filter(d => d.weight != null);
  if (!data.length) return null;
  const vals   = data.map(d => d.weight);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const pad    = (maxVal - minVal) * 0.15 || 2;

  // For many data points, only show every Nth x-axis tick
  const tickInterval = data.length > 20 ? Math.floor(data.length / 10) : 0;
  const isMobile = window.innerWidth <= 640;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-dim)" vertical={false} />
        <XAxis
          dataKey="label"
          interval={tickInterval}
          tick={isMobile ? false : { fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
          axisLine={{ stroke: 'var(--border-dim)' }}
          tickLine={false}
        />
        <YAxis
          domain={[minVal - pad, maxVal + pad]}
          tickFormatter={v => parseFloat(v).toFixed(2)}
          tick={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<WeightTooltip />} />
        <Line
          type="linear"
          dataKey="weight"
          stroke="var(--fg)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: 'var(--fg)', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: 'var(--fg)', strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TotalStats() {
  const { data: weightData,    refetch: refetchW }  = useWeightLog();
  const { data: nutritionData, refetch: refetchN }  = useNutrition();
  const { data: workoutData,   refetch: refetchWo } = useWorkouts();

  const [expandedDay, setExpandedDay] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // null | { ok, message }
  const [importing, setImporting]       = useState(false);
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);

  // Build union of all dates, sorted newest first
  const allDates = [...new Set([
    ...weightData.map(x => x.logDate),
    ...nutritionData.map(x => x.logDate),
    ...workoutData.map(x => x.sessionDate),
  ])].sort((a, b) => b.localeCompare(a));

  const rows = allDates.map(date => {
    const w  = weightData.find(x => x.logDate === date);
    const n  = nutritionData.find(x => x.logDate === date);
    const wo = workoutData.find(x => x.sessionDate === date);
    return {
      date,
      weightEntry: w, nutritionEntry: n, workoutEntry: wo,
      weight:   w  ? parseFloat(w.weightLbs)       : null,
      calories: n  ? (n.totalCalories ?? null)      : null,
      protein:  n  ? (n.totalProtein  ?? null)      : null,
      workout:  wo ? (wo.exerciseSets?.length > 0 ? groupByExercise(wo.exerciseSets).length + ' exercises' : 'logged') : null,
    };
  });

  const allWeights      = rows.map(r => r.weight);
  const totalWorkouts   = rows.filter(r => r.workout).length;
  const avgWeight       = avg(allWeights);
  const avgCalories     = avg(rows.map(r => r.calories));
  const avgProtein      = avg(rows.map(r => r.protein));

  // For weight bars show chronological order (oldest first)
  const weightBarDates   = [...allDates].reverse();
  const weightBarWeights = weightBarDates.map(d => rows.find(r => r.date === d)?.weight ?? null);

  // ── Export helpers ────────────────────────────────────────────────────────

  function buildExportData() {
    const statsData = rows.map(r => ({
      Date: formatDate(r.date),
      Weight: r.weight != null ? r.weight : '',
      Calories: r.calories != null ? r.calories : '',
      Protein: r.protein != null ? r.protein : '',
      Workout: r.workout ?? '',
    }));

    const workoutRows = [];
    for (const r of rows) {
      if (!r.workoutEntry?.exerciseSets?.length) continue;
      const groups = groupByExercise(r.workoutEntry.exerciseSets);
      for (const g of groups) {
        const row = {
          Date: formatDate(r.date),
          Exercise: g.name,
          Weight: g.sets[0]?.weightLbs != null ? parseFloat(g.sets[0].weightLbs) : '',
        };
        for (const s of g.sets) {
          row[`Set ${s.setNumber}`] = s.reps != null ? s.reps : '';
        }
        workoutRows.push(row);
      }
    }

    const maxSets = workoutRows.reduce((max, r) => {
      const nums = Object.keys(r).filter(k => k.startsWith('Set ')).map(k => parseInt(k.replace('Set ', '')));
      return Math.max(max, ...nums, 0);
    }, 0);
    const setHeaders = Array.from({ length: maxSets }, (_, i) => `Set ${i + 1}`);
    const normalizedWorkoutRows = workoutRows.map(r => {
      const row = { Date: r.Date, Exercise: r.Exercise, Weight: r.Weight };
      for (const h of setHeaders) row[h] = r[h] ?? '';
      return row;
    });

    return { statsData, normalizedWorkoutRows };
  }

  function handleExportXlsx() {
    const { statsData, normalizedWorkoutRows } = buildExportData();
    const ws1 = XLSX.utils.json_to_sheet(statsData);
    const ws2 = XLSX.utils.json_to_sheet(normalizedWorkoutRows.length ? normalizedWorkoutRows : [{ Date: '', Exercise: '', Weight: '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Total Stats');
    XLSX.utils.book_append_sheet(wb, ws2, 'Workouts');
    XLSX.writeFile(wb, 'total-stats.xlsx');
  }

  function handleExportJson() {
    const { statsData, normalizedWorkoutRows } = buildExportData();
    const json = JSON.stringify({ totalStats: statsData, workouts: normalizedWorkoutRows }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'total-stats.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportJson(e) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await api.post('/import', payload);
      const { weightImported, weightSkipped, nutritionImported, nutritionSkipped, workoutsImported, workoutsSkipped } = res.data;
      setImportStatus({
        ok: true,
        message: `imported: ${weightImported} weight, ${nutritionImported} nutrition, ${workoutsImported} workouts  |  skipped: ${weightSkipped} weight, ${nutritionSkipped} nutrition, ${workoutsSkipped} workouts`,
      });
      refetchW();
      refetchN();
      refetchWo();
    } catch {
      setImportStatus({ ok: false, message: 'import failed — check file format' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="total-page">
      <div className="weekly-header">
        <span className="weekly-title">TOTAL STATS</span>
        <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>all time</span>
      </div>

      {/* Summary */}
      <div className="section-box" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Summary</span>
        </div>
        <div className="section-body">
          <div className="weekly-summary-grid">
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg weight</span>
              <span className="weekly-stat-value">{avgWeight ? avgWeight + ' lbs' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg calories</span>
              <span className="weekly-stat-value">{avgCalories ? avgCalories + ' kcal' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">avg protein</span>
              <span className="weekly-stat-value">{avgProtein ? avgProtein + ' g' : '--'}</span>
            </div>
            <div className="weekly-stat">
              <span className="weekly-stat-label">total workouts</span>
              <span className="weekly-stat-value">{totalWorkouts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full log */}
      <div className="section-box">
        <div className="section-header">
          <span className="section-title">Full Log</span>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · click row to expand
          </span>
        </div>
        <div className="section-body" style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <div style={{ padding: '12px 14px' }} className="muted">No data logged yet.</div>
          ) : (
            <div className="weekly-table-wrap">
              <table className="weekly-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Workout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <>
                      <tr
                        key={r.date}
                        className={'weekly-row' + (r.date === today ? ' today-row' : '') + (expandedDay === r.date ? ' expanded-row' : '')}
                        onClick={() => setExpandedDay(expandedDay === r.date ? null : r.date)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{formatDate(r.date)}</td>
                        <td>{r.weight != null ? r.weight + ' lbs' : '--'}</td>
                        <td>{r.calories != null ? r.calories : '--'}</td>
                        <td>{r.protein != null ? r.protein + 'g' : '--'}</td>
                        <td>{r.workout ?? '--'}</td>
                      </tr>
                      {expandedDay === r.date && (
                        <tr key={r.date + '-detail'} className="detail-row">
                          <td colSpan={5}>
                            <DayDetail
                              date={r.date}
                              weightEntry={r.weightEntry}
                              nutritionEntry={r.nutritionEntry}
                              workoutEntry={r.workoutEntry}
                              onRefetchW={refetchW}
                              onRefetchN={refetchN}
                              onRefetchWo={refetchWo}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="export-bar">
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>export</span>
          <div className="export-bar-btns">
            {rows.length > 0 && <>
              <button className="btn btn-sm" onClick={handleExportXlsx}>[xlsx]</button>
              <button className="btn btn-sm" onClick={handleExportJson}>[json]</button>
            </>}
            <button className="btn btn-sm" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? '[importing...]' : '[import json]'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
          </div>
        </div>
        {importStatus && (
          <div className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 6, color: importStatus.ok ? 'var(--fg)' : 'var(--muted)' }}>
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Weight trend */}
      {weightBarWeights.some(w => w != null) && (
        <div className="section-box">
          <div className="section-header">
            <span className="section-title">Weight Trend</span>
            <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>oldest → newest</span>
          </div>
          <div className="section-body">
            <WeightLineChart dates={weightBarDates} weights={weightBarWeights} />
          </div>
        </div>
      )}
    </div>
  );
}