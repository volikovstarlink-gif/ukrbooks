'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';

interface VisitsByDay {
  date: string;
  visits: number;
  unique: number;
}

interface OverviewData {
  configured: boolean;
  todayUnique: number;
  todayVisits: number;
  todayDownloads: number;
  unique7d: number;
  visits7d: number;
  downloads7d: number;
  adsImpressions7d: number;
  adsCtr: number;
  storageGB: number;
  storageLimit: number;
  storagePercent: number;
  storageSeverity: 'ok' | 'warn' | 'critical';
  downloadErrors: number;
  adsErrors: number;
  byDay: VisitsByDay[];
  downloadsByDay: Array<{ date: string; value: number }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  async function handleReset() {
    const confirmed = window.confirm(
      'Скинути всю статистику в адмінці?\n\n' +
        'Буде очищено:\n' +
        '• відвідування (всі дати)\n' +
        '• скачування (лічильники, топ-книги, останні події)\n' +
        '• реклама (всі мережі, покази, кліки, помилки)\n' +
        '• журнал помилок\n\n' +
        'Дію не можна скасувати — рахунки підуть з нуля від сьогодні.',
    );
    if (!confirmed) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin/analytics/reset', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetMsg(`❌ Помилка: ${body.error ?? res.status}`);
      } else {
        setResetMsg(`✅ Скинуто ${body.total ?? 0} ключів. Рахунок з ${new Date().toLocaleDateString('uk-UA')}.`);
        setReloadKey((k) => k + 1);
      }
    } catch (e) {
      setResetMsg(`❌ Помилка мережі: ${String(e)}`);
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [visitsR, downloadsR, adsR, storageR] = await Promise.all([
          fetch('/api/admin/analytics/visits?period=7d').then(r => r.json()),
          fetch('/api/admin/analytics/downloads?period=7d').then(r => r.json()),
          fetch('/api/admin/analytics/ads?period=7d').then(r => r.json()),
          fetch('/api/admin/storage').then(r => r.json()),
        ]);

        const byDay: VisitsByDay[] = visitsR?.byDay ?? [];
        const downloadsByDay: Array<{ date: string; value: number }> = downloadsR?.byDay ?? [];
        const last = byDay[byDay.length - 1];
        const lastDl = downloadsByDay[downloadsByDay.length - 1];

        setData({
          configured: visitsR?.configured ?? false,
          todayUnique: last?.unique ?? 0,
          todayVisits: last?.visits ?? 0,
          todayDownloads: lastDl?.value ?? 0,
          unique7d: visitsR?.totals?.unique ?? 0,
          visits7d: visitsR?.totals?.visits ?? 0,
          downloads7d: downloadsR?.total ?? 0,
          adsImpressions7d: adsR?.totals?.impressions ?? 0,
          adsCtr: adsR?.totals?.ctr ?? 0,
          storageGB: storageR?.totalGB ?? 0,
          storageLimit: storageR?.limitGB ?? 10,
          storagePercent: storageR?.percent ?? 0,
          storageSeverity: storageR?.severity ?? 'ok',
          downloadErrors: Array.isArray(downloadsR?.errors) ? downloadsR.errors.length : 0,
          adsErrors: Array.isArray(adsR?.errors) ? adsR.errors.length : 0,
          byDay,
          downloadsByDay,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const chartData = data
    ? data.byDay.map((d, i) => ({
        date: d.date.slice(5),
        unique: d.unique,
        downloads: data.downloadsByDay[i]?.value ?? 0,
      }))
    : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">📊 Огляд</h1>
        <p className="text-slate-400 text-xs sm:text-sm">Актуальна статистика: сьогодні та за 7 днів</p>
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-300">
          ⚠️ <strong>Upstash Redis не налаштовано.</strong> Лічильники показують нулі. Додайте
          <code className="bg-yellow-500/20 px-1 rounded mx-1">UPSTASH_REDIS_REST_URL</code> та
          <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code>.
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#1e293b] rounded-2xl p-4 h-28 animate-pulse border border-white/10" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#1e293b] rounded-2xl p-4 h-24 animate-pulse border border-white/10" />
            ))}
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          <section>
            <h2 className="text-xs sm:text-sm uppercase tracking-wider text-slate-500 mb-2 px-1">Сьогодні</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/admin/visits" className="min-w-0">
                <StatCard
                  label="Унікальні відвідувачі"
                  value={data.todayUnique.toLocaleString('uk-UA')}
                  color="text-blue-400"
                  icon="👥"
                  size="lg"
                  sub={`${data.todayVisits.toLocaleString('uk-UA')} переглядів`}
                />
              </Link>
              <Link href="/admin/downloads" className="min-w-0">
                <StatCard
                  label="Скачувань"
                  value={data.todayDownloads.toLocaleString('uk-UA')}
                  color="text-emerald-400"
                  icon="📥"
                  size="lg"
                />
              </Link>
              <Link href="/admin/storage" className="min-w-0">
                <StatCard
                  label="Сховище"
                  value={`${data.storagePercent.toFixed(1)}%`}
                  color={
                    data.storageSeverity === 'critical'
                      ? 'text-red-400'
                      : data.storageSeverity === 'warn'
                      ? 'text-yellow-400'
                      : 'text-cyan-400'
                  }
                  icon="☁️"
                  size="lg"
                  sub={`${data.storageGB.toFixed(2)} / ${data.storageLimit} GB`}
                />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-xs sm:text-sm uppercase tracking-wider text-slate-500 mb-2 px-1">За 7 днів</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/admin/visits" className="min-w-0">
                <StatCard
                  label="Унікальні"
                  value={data.unique7d.toLocaleString('uk-UA')}
                  color="text-blue-400"
                  icon="👤"
                />
              </Link>
              <Link href="/admin/visits" className="min-w-0">
                <StatCard
                  label="Переглядів"
                  value={data.visits7d.toLocaleString('uk-UA')}
                  color="text-purple-400"
                  icon="📄"
                />
              </Link>
              <Link href="/admin/downloads" className="min-w-0">
                <StatCard
                  label="Скачувань"
                  value={data.downloads7d.toLocaleString('uk-UA')}
                  color="text-emerald-400"
                  icon="📥"
                />
              </Link>
              <Link href="/admin/ads" className="min-w-0">
                <StatCard
                  label="CTR реклами"
                  value={`${data.adsCtr}%`}
                  color="text-cyan-400"
                  icon="💰"
                  sub={`${data.adsImpressions7d.toLocaleString('uk-UA')} показів`}
                />
              </Link>
            </div>
          </section>

          <LineChartCard
            title="Динаміка за 7 днів"
            data={chartData}
            xKey="date"
            series={[
              { dataKey: 'unique', label: 'Унікальні', color: '#60a5fa' },
              { dataKey: 'downloads', label: 'Скачування', color: '#34d399' },
            ]}
          />

          {(data.downloadErrors > 0 || data.adsErrors > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Помилки скачувань (7 днів)"
                value={data.downloadErrors}
                color={data.downloadErrors > 0 ? 'text-red-400' : 'text-slate-400'}
                icon="⚠️"
                size="sm"
              />
              <StatCard
                label="Помилки реклами (7 днів)"
                value={data.adsErrors}
                color={data.adsErrors > 0 ? 'text-red-400' : 'text-slate-400'}
                icon="⚠️"
                size="sm"
              />
            </div>
          )}

          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-red-300 text-sm sm:text-base">⚠️ Скинути статистику</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Очистити всі історичні дані (візити, скачування, реклама, помилки). Дію не можна скасувати — рахунок піде з нуля від сьогодні.
                </p>
                {resetMsg && (
                  <p className="text-xs mt-2 text-slate-300">{resetMsg}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap"
              >
                {resetting ? 'Скидаю…' : 'Скинути всю статистику'}
              </button>
            </div>
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
            <h3 className="font-semibold mb-3 text-slate-200 text-sm sm:text-base">🔗 Зовнішні сервіси</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'R2 Bucket', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/r2/default/buckets/ukrbooks-files' },
                { label: 'CF Analytics', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/ukrbooks.ink/analytics/traffic' },
                { label: 'Vercel', href: 'https://vercel.com/dashboard' },
                { label: 'Upstash', href: 'https://console.upstash.com' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs sm:text-sm text-center text-slate-300 hover:text-white transition-colors border border-white/10"
                >
                  {label} ↗
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
