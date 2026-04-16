'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Period = '1d' | '7d' | '30d';

interface DayStats {
  date: string;
  requests: number;
  pageViews: number;
  visitors: number;
  bandwidthMB: string;
}

interface StatsData {
  period: Period;
  analytics: {
    totalRequests: number;
    totalPageViews: number;
    totalVisitors: number;
    totalBandwidthGB: string;
    byDay: DayStats[];
  } | null;
  storage: {
    totalGB: string | number;
    fileCount: string | number;
    note: string | null;
  };
  cfConfigured: boolean;
  freeTierLimit: { storageGB: number; readsPerMonth: number; writesPerMonth: number };
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-[#1e293b] rounded-2xl p-6 border border-white/10`}>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = Math.min((used / max) * 100, 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{typeof used === 'number' ? used.toFixed(2) : used}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      setError('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  }, [period, router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const periodLabel: Record<Period, string> = { '1d': 'Сьогодні', '7d': '7 днів', '30d': '30 днів' };

  const storageGB = typeof data?.storage.totalGB === 'string'
    ? parseFloat(data.storage.totalGB.replace('~', ''))
    : (data?.storage.totalGB ?? 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div>
            <h1 className="font-bold text-lg">UkrBooks Admin</h1>
            <p className="text-slate-400 text-xs">ukrbooks.ink</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://ukrbooks.ink" target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-white transition-colors">
            Сайт ↗
          </a>
          <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-white transition-colors">
            Cloudflare ↗
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Статистика</h2>
          <div className="flex gap-2">
            {(['1d', '7d', '30d'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>
                {periodLabel[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Status banner if CF not configured */}
        {data && !data.cfConfigured && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
            ⚠️ <strong>Cloudflare Analytics не налаштовано.</strong>{' '}
            Додайте <code className="bg-yellow-500/20 px-1 rounded">CF_ANALYTICS_TOKEN</code> до Vercel Environment Variables
            для перегляду трафіку. Зараз показуються тільки дані про R2 сховище.
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="bg-[#1e293b] rounded-2xl p-6 h-28 animate-pulse border border-white/10" />
            ))}
          </div>
        )}

        {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-4">{error}</p>}

        {data && !loading && (
          <>
            {/* Traffic stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label={`Відвідувачів (${periodLabel[period]})`}
                value={data.analytics ? data.analytics.totalVisitors.toLocaleString() : '—'}
                color="text-blue-400"
              />
              <StatCard
                label={`Перегляди сторінок`}
                value={data.analytics ? data.analytics.totalPageViews.toLocaleString() : '—'}
                color="text-purple-400"
              />
              <StatCard
                label="Запити всього"
                value={data.analytics ? data.analytics.totalRequests.toLocaleString() : '—'}
                color="text-cyan-400"
              />
              <StatCard
                label="Трафік"
                value={data.analytics ? `${data.analytics.totalBandwidthGB} GB` : '—'}
                color="text-green-400"
              />
            </div>

            {/* Daily breakdown */}
            {data.analytics && data.analytics.byDay.length > 0 && (
              <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
                <h3 className="font-semibold mb-4 text-slate-200">По днях</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/10">
                        <th className="text-left py-2 pr-4">Дата</th>
                        <th className="text-right py-2 pr-4">Відвідувачів</th>
                        <th className="text-right py-2 pr-4">Переглядів</th>
                        <th className="text-right py-2 pr-4">Запитів</th>
                        <th className="text-right py-2">Трафік, MB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analytics.byDay.map((day) => (
                        <tr key={day.date} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 pr-4 text-slate-300">{day.date}</td>
                          <td className="text-right py-2 pr-4 text-blue-400">{day.visitors.toLocaleString()}</td>
                          <td className="text-right py-2 pr-4 text-purple-400">{day.pageViews.toLocaleString()}</td>
                          <td className="text-right py-2 pr-4 text-cyan-400">{day.requests.toLocaleString()}</td>
                          <td className="text-right py-2 text-green-400">{day.bandwidthMB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* R2 Storage */}
            <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
              <h3 className="font-semibold mb-4 text-slate-200">☁️ Cloudflare R2 — Використання сховища</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <UsageBar
                    used={storageGB}
                    max={data.freeTierLimit.storageGB}
                    label={`Сховище: ${storageGB.toFixed(3)} GB / ${data.freeTierLimit.storageGB} GB`}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Файлів у бакеті</span>
                    <span className="text-white font-medium">{data.storage.fileCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Тариф</span>
                    <span className="text-green-400 font-medium">Free (безкоштовно)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Ліміт reads/місяць</span>
                    <span className="text-white font-medium">10,000,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Ліміт writes/місяць</span>
                    <span className="text-white font-medium">1,000,000</span>
                  </div>
                  {data.storage.note && (
                    <p className="text-yellow-400/70 text-xs mt-2">{data.storage.note}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
              <h3 className="font-semibold mb-4 text-slate-200">🔗 Швидкі посилання</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'R2 Bucket', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/r2/default/buckets/ukrbooks-files' },
                  { label: 'CF Analytics', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/ukrbooks.ink/analytics/traffic' },
                  { label: 'Vercel Deploy', href: 'https://vercel.com/volikovvv-1506s-projects/ukrbooks' },
                  { label: 'GitHub Repo', href: 'https://github.com/volikovstarlink-gif/ukrbooks' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-center text-slate-300 hover:text-white transition-colors border border-white/10">
                    {label} ↗
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
