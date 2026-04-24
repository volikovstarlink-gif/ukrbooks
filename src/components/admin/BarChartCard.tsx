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

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function BarChartCard({
  title,
  data,
  color = '#60a5fa',
  height,
  layout = 'horizontal',
  empty,
}: BarChartCardProps) {
  const hasData = data.some(d => d.value > 0);
  const isVertical = layout === 'vertical';
  const rowCount = data.length || 1;
  const autoHeight = isVertical ? Math.max(240, rowCount * 26) : 240;
  const resolvedHeight = height ?? autoHeight;
  const displayData = isVertical ? data.map(d => ({ ...d, label: truncate(d.label, 40) })) : data;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
      <h3 className="font-semibold mb-4 text-slate-200 text-sm sm:text-base">{title}</h3>
      {hasData ? (
        <div style={{ height: resolvedHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              layout={isVertical ? 'vertical' : 'horizontal'}
              margin={isVertical ? { top: 5, right: 12, left: 4, bottom: 5 } : { top: 5, right: 8, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              {isVertical ? (
                <>
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    width={110}
                    interval={0}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} width={32} />
                </>
              )}
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {displayData.map((_, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
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
