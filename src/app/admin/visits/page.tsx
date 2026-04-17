'use client';
import { useCallback, useEffect, useState } from 'react';
import PeriodSwitcher, { type Period, PERIOD_LABELS } from '@/components/admin/PeriodSwitcher';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';

interface VisitsData {
  period: Period;
  configured: boolean;
  totals: { visits: number; unique: number };
  byDay: Array<{ date: string; visits: number; unique: number }>;
  errors: ErrorEvent[];
}

export default function VisitsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<VisitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics/visits?period=${period}`);
      if (!res.ok) throw new Error('fail');
      setData(await res.json());
    } catch {
      setError('Не вдалося завантажити дані');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">👥 Відвідування</h1>
          <p className="text-slate-400 text-sm">Статистика переглядів та унікальних користувачів</p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
          ⚠️ <strong>Upstash Redis не налаштовано.</strong> Додайте <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_URL</code> та <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code> у середовище, щоб почати збір статистики.
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-2xl p-6 h-28 animate-pulse border border-white/10" />
          ))}
        </div>
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-4">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              label={`Унікальні відвідувачі (${PERIOD_LABELS[period]})`}
              value={data.totals.unique.toLocaleString('uk-UA')}
              color="text-blue-400"
              icon="👤"
            />
            <StatCard
              label={`Перегляди сторінок (${PERIOD_LABELS[period]})`}
              value={data.totals.visits.toLocaleString('uk-UA')}
              color="text-purple-400"
              icon="📄"
            />
          </div>

          <LineChartCard
            title="Динаміка по днях"
            data={data.byDay}
            xKey="date"
            series={[
              { dataKey: 'unique', label: 'Унікальні', color: '#60a5fa' },
              { dataKey: 'visits', label: 'Перегляди', color: '#c084fc' },
            ]}
          />

          <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
            <h3 className="font-semibold mb-4 text-slate-200">По днях</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Дата</th>
                    <th className="text-right py-2 pr-4">Унікальні</th>
                    <th className="text-right py-2">Перегляди</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDay.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-500">Немає даних</td>
                    </tr>
                  )}
                  {data.byDay.map(day => (
                    <tr key={day.date} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 text-slate-300">{day.date}</td>
                      <td className="text-right py-2 pr-4 text-blue-400">{day.unique.toLocaleString('uk-UA')}</td>
                      <td className="text-right py-2 text-purple-400">{day.visits.toLocaleString('uk-UA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ErrorsList title="Помилки відвідувань" items={data.errors} />
        </>
      )}
    </div>
  );
}
