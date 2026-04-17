'use client';
import { useCallback, useEffect, useState } from 'react';
import PeriodSwitcher, { type Period, PERIOD_LABELS } from '@/components/admin/PeriodSwitcher';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import BarChartCard from '@/components/admin/BarChartCard';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';

interface DownloadsData {
  period: Period;
  configured: boolean;
  total: number;
  byDay: Array<{ date: string; value: number }>;
  topBooks: Array<{ slug: string; title: string; count: number }>;
  recent: Array<{ ts: number; slug?: string; title?: string; format?: string }>;
  errors: ErrorEvent[];
}

function formatTs(ts?: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function DownloadsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<DownloadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics/downloads?period=${period}`);
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
          <h1 className="text-2xl font-bold">📥 Скачування</h1>
          <p className="text-slate-400 text-sm">Лічильники, топ книг та помилки завантажень</p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
          ⚠️ Upstash Redis не налаштовано — лічильники не збираються.
        </div>
      )}

      {loading && (
        <div className="bg-[#1e293b] rounded-2xl p-6 h-24 animate-pulse border border-white/10" />
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-4">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label={`Всього скачувань (${PERIOD_LABELS[period]})`}
              value={data.total.toLocaleString('uk-UA')}
              color="text-emerald-400"
              icon="📥"
            />
            <StatCard
              label="Книг у топі"
              value={data.topBooks.length}
              color="text-blue-400"
              icon="📚"
            />
            <StatCard
              label="Помилки завантажень"
              value={data.errors.length}
              color={data.errors.length > 0 ? 'text-red-400' : 'text-slate-400'}
              icon="⚠️"
            />
          </div>

          <LineChartCard
            title="Динаміка скачувань"
            data={data.byDay}
            xKey="date"
            series={[{ dataKey: 'value', label: 'Скачувань', color: '#34d399' }]}
          />

          <BarChartCard
            title="🏆 Топ-20 книг (за весь час)"
            data={data.topBooks.map(b => ({ label: b.title || b.slug, value: b.count }))}
            color="#60a5fa"
            layout="vertical"
            height={Math.max(280, data.topBooks.length * 28)}
            empty="Поки немає скачувань"
          />

          <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
            <h3 className="font-semibold mb-4 text-slate-200">🕒 Останні скачування</h3>
            {data.recent.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Поки порожньо</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="text-left py-2 pr-4">Час</th>
                      <th className="text-left py-2 pr-4">Книга</th>
                      <th className="text-left py-2">Формат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatTs(r.ts)}</td>
                        <td className="py-2 pr-4 text-slate-200 truncate max-w-md">{r.title || r.slug}</td>
                        <td className="py-2 text-slate-300 uppercase text-xs">{r.format || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ErrorsList title="Помилки скачувань" items={data.errors} />
        </>
      )}
    </div>
  );
}
