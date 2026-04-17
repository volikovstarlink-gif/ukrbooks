'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

export interface LineSeries {
  dataKey: string;
  label: string;
  color: string;
}

interface LineChartCardProps {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: LineSeries[];
  height?: number;
  empty?: string;
}

export default function LineChartCard({ title, data, xKey, series, height = 280, empty }: LineChartCardProps) {
  const hasData = data.some(d => series.some(s => Number(d[s.dataKey]) > 0));
  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
      <h3 className="font-semibold mb-4 text-slate-200">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
            {series.map(s => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
          {empty ?? 'Немає даних для відображення'}
        </div>
      )}
    </div>
  );
}
