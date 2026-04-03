// Date object → 'YYYY-MM-DD'
export function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' → 'M/D'  (charts in Dashboard, Strength, Nutrition)
export function formatDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

// 'YYYY-MM-DD' → 'M/D/YY'  (TotalStats)
export function formatDateShort(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
}

// 'YYYY-MM-DD' → 'M/D/YYYY'  (Today page header)
export function formatDateFull(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

// 'YYYY-MM-DD' → 'Mon M/D'  (WeeklyStats chart labels and table)
export function shortDate(iso) {
  const [, m, d] = iso.split('-');
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = names[new Date(iso + 'T12:00:00').getDay()];
  return `${day} ${parseInt(m)}/${parseInt(d)}`;
}

// Average of non-null numbers → toFixed(1) string, or null if no valid values
export function avg(nums) {
  const valid = nums.filter(n => n != null);
  if (!valid.length) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}
