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
  empty?: string;
}

export default function LineChartCard({ title, data, xKey, series, empty }: LineChartCardProps) {
  const hasData = data.some(d => series.some(s => Number(d[s.dataKey]) > 0));
  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
      <h3 className="font-semibold mb-4 text-slate-200 text-sm sm:text-base">{title}</h3>
      {hasData ? (
        <div className="h-[220px] sm:h-[280px] -ml-2 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} width={32} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
              {series.map(s => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-slate-500 text-xs sm:text-sm text-center px-4">
          {empty ?? 'Немає даних для відображення'}
        </div>
      )}
    </div>
  );
}
