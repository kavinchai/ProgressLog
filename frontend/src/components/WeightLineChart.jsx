import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value} lbs</div>
    </div>
  );
}

// data: Array<{ label: string, weight: number | null }>
// height: optional chart height (default 200)
export default function WeightLineChart({ data, height = 200 }) {
  const valid = data.filter(d => d.weight != null);
  if (!valid.length) return null;
  const vals   = valid.map(d => d.weight);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const pad    = (maxVal - minVal) * 0.15 || 2;
  const isMobile    = window.innerWidth <= 640;
  const tickInterval = data.length > 20 ? Math.floor(data.length / 10) : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
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
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
