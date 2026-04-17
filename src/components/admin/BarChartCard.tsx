'use client';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BarChartCardProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  empty?: string;
}

export default function BarChartCard({
  title,
  data,
  color = '#60a5fa',
  height = 320,
  layout = 'horizontal',
  empty,
}: BarChartCardProps) {
  const hasData = data.some(d => d.value > 0);
  const isVertical = layout === 'vertical';
  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
      <h3 className="font-semibold mb-4 text-slate-200">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout={isVertical ? 'vertical' : 'horizontal'}
            margin={isVertical ? { top: 5, right: 12, left: 80, bottom: 5 } : { top: 5, right: 12, left: -12, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            {isVertical ? (
              <>
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              </>
            )}
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }}
              labelStyle={{ color: '#cbd5e1' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
          {empty ?? 'Немає даних для відображення'}
        </div>
      )}
    </div>
  );
}
