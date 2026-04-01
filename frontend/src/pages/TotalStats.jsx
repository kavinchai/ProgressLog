import { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../api';
import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts  from '../hooks/useWorkouts';
import DayDetail from '../components/DayDetail';
import { groupByExercise } from '../utils/workout';
import './WeeklyStats.css';
import './TotalStats.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return parseInt(m) + '/' + parseInt(d) + '/' + y.slice(2);
}

function avg(nums) {
  const valid = nums.filter(n => n != null);
  if (!valid.length) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
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

const RANGE_OPTIONS = ['30d', '90d', '1yr', 'all'];
const RANGE_DAYS    = { '30d': 30, '90d': 90, '1yr': 365, 'all': Infinity };

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return MONTH_NAMES[parseInt(m) - 1] + ' ' + y;
}

export default function TotalStats() {
  const { data: weightData,    refetch: refetchWeight }    = useWeightLog();
  const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
  const { data: workoutData,   refetch: refetchWorkouts }  = useWorkouts();

  const [expandedDay,   setExpandedDay]   = useState(null);
  const [importStatus,  setImportStatus]  = useState(null);
  const [importing,     setImporting]     = useState(false);
  const [rangeKey,      setRangeKey]      = useState('90d');
  const [logMonth,      setLogMonth]      = useState(null);
  const [picker,        setPicker]        = useState(null);
  const fileInputRef = useRef(null);

  const today = localDateStr(new Date());

  const allDates = [...new Set([
    ...weightData.map(x => x.logDate),
    ...nutritionData.map(x => x.logDate),
    ...workoutData.map(x => x.sessionDate),
  ])].sort((a, b) => b.localeCompare(a));

  const rows = allDates.map(date => {
    const weightEntry    = weightData.find(x => x.logDate === date);
    const nutritionEntry = nutritionData.find(x => x.logDate === date);
    const workoutEntry   = workoutData.find(x => x.sessionDate === date);
    return {
      date,
      weightEntry, nutritionEntry, workoutEntry,
      weight:   weightEntry    ? parseFloat(weightEntry.weightLbs)       : null,
      calories: nutritionEntry ? (nutritionEntry.totalCalories ?? null)   : null,
      protein:  nutritionEntry ? (nutritionEntry.totalProtein  ?? null)   : null,
      workout:  workoutEntry   ? (workoutEntry.exerciseSets?.length > 0
        ? new Set(workoutEntry.exerciseSets.map(s => s.exerciseName)).size + ' exercises'
        : 'logged') : null,
    };
  });

  const allWeights    = rows.map(row => row.weight);
  const totalWorkouts = rows.filter(row => row.workout).length;
  const avgWeight     = avg(allWeights);
  const avgCalories   = avg(rows.map(row => row.calories));
  const avgProtein    = avg(rows.map(row => row.protein));

  const cutoff = RANGE_DAYS[rangeKey] === Infinity
    ? null
    : localDateStr(new Date(Date.now() - RANGE_DAYS[rangeKey] * 86400000));
  const weightBarDates   = [...allDates].reverse().filter(d => !cutoff || d >= cutoff);
  const weightBarWeights = weightBarDates.map(d => rows.find(row => row.date === d)?.weight ?? null);

  const allMonths      = [...new Set(allDates.map(d => d.slice(0, 7)))].sort();
  const activeMonth    = logMonth ?? today.slice(0, 7);
  const monthIdx       = allMonths.indexOf(activeMonth);

  const monthRows = (() => {
    if (activeMonth > today.slice(0, 7)) return [];
    const [y, m] = activeMonth.split('-').map(Number);
    const lastOfMonth = localDateStr(new Date(y, m, 0));
    const end = lastOfMonth < today ? lastOfMonth : today;
    const days = [];
    for (let d = new Date(`${activeMonth}-01T00:00:00`); d <= new Date(`${end}T00:00:00`); d.setDate(d.getDate() + 1)) {
      days.push(localDateStr(d));
    }
    return days.reverse().map(date => rows.find(row => row.date === date) ?? {
      date, weightEntry: null, nutritionEntry: null, workoutEntry: null,
      weight: null, calories: null, protein: null, workout: null,
    });
  })();
  const [activeYear, activeMonthNum] = activeMonth.split('-');
  const allYears       = [...new Set(allMonths.map(m => m.slice(0, 4)))].sort();
  const monthsWithData = new Set(allMonths.filter(m => m.startsWith(activeYear)).map(m => m.slice(5, 7)));

  function goMonth(ym) { setLogMonth(ym); setExpandedDay(null); setPicker(null); }
  function selectMonth(mm) { goMonth(`${activeYear}-${mm}`); }
  function selectYear(y) {
    const sameMonth = `${y}-${activeMonthNum}`;
    if (allMonths.includes(sameMonth)) {
      goMonth(sameMonth);
    } else {
      const yearMonths = allMonths.filter(m => m.startsWith(y));
      goMonth(yearMonths[yearMonths.length - 1]);
    }
  }
  function togglePicker(type) { setPicker(p => p === type ? null : type); }

  // ── Export helpers ────────────────────────────────────────────────────────

  function buildExportData() {
    const statsData = rows.map(row => ({
      Date: formatDate(row.date),
      Weight: row.weight != null ? row.weight : '',
      Calories: row.calories != null ? row.calories : '',
      Protein: row.protein != null ? row.protein : '',
      Workout: row.workout ?? '',
    }));

    const workoutRows = [];
    for (const row of rows) {
      if (!row.workoutEntry?.exerciseSets?.length) continue;
      const groups = groupByExercise(row.workoutEntry.exerciseSets);
      for (const g of groups) {
        const exportRow = { Date: formatDate(row.date), Exercise: g.name, Weight: g.weight };
        for (const s of g.sets) {
          exportRow[`Set ${s.setNumber}`] = s.reps != null ? s.reps : '';
        }
        workoutRows.push(exportRow);
      }
    }

    const maxSets = workoutRows.reduce((max, row) => {
      const nums = Object.keys(row).filter(k => k.startsWith('Set ')).map(k => parseInt(k.replace('Set ', '')));
      return Math.max(max, ...nums, 0);
    }, 0);
    const setHeaders = Array.from({ length: maxSets }, (_, i) => `Set ${i + 1}`);
    const normalizedWorkoutRows = workoutRows.map(row => {
      const normalized = { Date: row.Date, Exercise: row.Exercise, Weight: row.Weight };
      for (const h of setHeaders) normalized[h] = row[h] ?? '';
      return normalized;
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
      refetchWeight();
      refetchNutrition();
      refetchWorkouts();
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
        {allMonths.length > 0 && (
          <>
            <div className="month-nav">
              <button className="btn btn-sm" onClick={() => goMonth(allMonths[monthIdx - 1])} disabled={monthIdx <= 0}>[prev]</button>
              <span className="month-nav-label">
                <button className={'btn btn-sm' + (picker === 'month' ? ' range-active' : '')} onClick={() => togglePicker('month')}>
                  {MONTH_NAMES[parseInt(activeMonthNum) - 1]}
                </button>
                <button className={'btn btn-sm' + (picker === 'year' ? ' range-active' : '')} onClick={() => togglePicker('year')}>
                  {activeYear}
                </button>
              </span>
              <button className="btn btn-sm" onClick={() => goMonth(allMonths[monthIdx + 1])} disabled={monthIdx >= allMonths.length - 1}>[next]</button>
            </div>
            {picker === 'month' && (
              <div className="month-picker">
                {Array.from({ length: 12 }, (_, i) => {
                  const mm = String(i + 1).padStart(2, '0');
                  const hasData = monthsWithData.has(mm);
                  return (
                    <button
                      key={mm}
                      className={'btn btn-sm' + (mm === activeMonthNum ? ' range-active' : '')}
                      onClick={() => selectMonth(mm)}
                      disabled={!hasData}
                    >
                      {MONTH_NAMES[i].slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}
            {picker === 'year' && (
              <div className="month-picker">
                {allYears.map(y => (
                  <button
                    key={y}
                    className={'btn btn-sm' + (y === activeYear ? ' range-active' : '')}
                    onClick={() => selectYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div className="section-body" style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <div style={{ padding: '12px 14px' }} className="muted">No data logged yet.</div>
          ) : monthRows.length === 0 ? (
            <div style={{ padding: '12px 14px' }} className="muted">No entries for {monthLabel(activeMonth)}.</div>
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
                  {monthRows.map(row => (
                    <>
                      <tr
                        key={row.date}
                        className={'weekly-row' + (row.date === today ? ' today-row' : '') + (expandedDay === row.date ? ' expanded-row' : '')}
                        onClick={() => setExpandedDay(expandedDay === row.date ? null : row.date)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{formatDate(row.date)}</td>
                        <td>{row.weight != null ? row.weight + ' lbs' : '--'}</td>
                        <td>{row.calories != null ? row.calories : '--'}</td>
                        <td>{row.protein != null ? row.protein + 'g' : '--'}</td>
                        <td>{row.workout ?? '--'}</td>
                      </tr>
                      {expandedDay === row.date && (
                        <tr key={row.date + '-detail'} className="detail-row">
                          <td colSpan={5}>
                            <DayDetail
                              date={row.date}
                              weightEntry={row.weightEntry}
                              nutritionEntry={row.nutritionEntry}
                              workoutEntry={row.workoutEntry}
                              onRefetchW={refetchWeight}
                              onRefetchN={refetchNutrition}
                              onRefetchWo={refetchWorkouts}
                              showDelete={false}
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
            <div className="range-selector">
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r}
                  className={'btn btn-sm' + (rangeKey === r ? ' range-active' : '')}
                  onClick={() => setRangeKey(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="section-body">
            <WeightLineChart dates={weightBarDates} weights={weightBarWeights} />
          </div>
        </div>
      )}
    </div>
  );
}
