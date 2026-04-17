'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/admin/StatCard';

interface OverviewSnapshot {
  visits7d: number;
  unique7d: number;
  downloads7d: number;
  adsImpressions7d: number;
  adsClicks7d: number;
  adsCtr: number;
  storageGB: number;
  storageLimit: number;
  storagePercent: number;
  storageSeverity: 'ok' | 'warn' | 'critical';
  downloadErrors: number;
  adsErrors: number;
  configured: boolean;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

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
        setData({
          visits7d: visitsR?.totals?.visits ?? 0,
          unique7d: visitsR?.totals?.unique ?? 0,
          downloads7d: downloadsR?.total ?? 0,
          adsImpressions7d: adsR?.totals?.impressions ?? 0,
          adsClicks7d: adsR?.totals?.clicks ?? 0,
          adsCtr: adsR?.totals?.ctr ?? 0,
          storageGB: storageR?.totalGB ?? 0,
          storageLimit: storageR?.limitGB ?? 10,
          storagePercent: storageR?.percent ?? 0,
          storageSeverity: storageR?.severity ?? 'ok',
          downloadErrors: Array.isArray(downloadsR?.errors) ? downloadsR.errors.length : 0,
          adsErrors: Array.isArray(adsR?.errors) ? adsR.errors.length : 0,
          configured: visitsR?.configured ?? false,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Огляд</h1>
        <p className="text-slate-400 text-sm">Зведена статистика за останні 7 днів</p>
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
          ⚠️ <strong>Upstash Redis не налаштовано.</strong> Лічильники показують нулі. Додайте <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_URL</code> та <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code> у середовище.
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-2xl p-6 h-28 animate-pulse border border-white/10" />
          ))}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/visits" className="hover:scale-[1.01] transition-transform">
              <StatCard
                label="Унікальні відвідувачі"
                value={data.unique7d.toLocaleString('uk-UA')}
                color="text-blue-400"
                icon="👥"
                sub="за 7 днів"
              />
            </Link>
            <Link href="/admin/downloads" className="hover:scale-[1.01] transition-transform">
              <StatCard
                label="Скачування"
                value={data.downloads7d.toLocaleString('uk-UA')}
                color="text-emerald-400"
                icon="📥"
                sub="за 7 днів"
              />
            </Link>
            <Link href="/admin/ads" className="hover:scale-[1.01] transition-transform">
              <StatCard
                label="Покази реклами"
                value={data.adsImpressions7d.toLocaleString('uk-UA')}
                color="text-purple-400"
                icon="💰"
                sub={`CTR ${data.adsCtr}%`}
              />
            </Link>
            <Link href="/admin/storage" className="hover:scale-[1.01] transition-transform">
              <StatCard
                label="Сховище"
                value={`${data.storageGB.toFixed(2)} GB`}
                color={
                  data.storageSeverity === 'critical'
                    ? 'text-red-400'
                    : data.storageSeverity === 'warn'
                    ? 'text-yellow-400'
                    : 'text-cyan-400'
                }
                icon="☁️"
                sub={`${data.storagePercent.toFixed(1)}% з ${data.storageLimit} GB`}
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              label="Помилки скачувань (7 днів)"
              value={data.downloadErrors}
              color={data.downloadErrors > 0 ? 'text-red-400' : 'text-slate-400'}
              icon="⚠️"
            />
            <StatCard
              label="Помилки реклами (7 днів)"
              value={data.adsErrors}
              color={data.adsErrors > 0 ? 'text-red-400' : 'text-slate-400'}
              icon="⚠️"
            />
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
            <h3 className="font-semibold mb-4 text-slate-200">🔗 Швидкі посилання</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'R2 Bucket', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/r2/default/buckets/ukrbooks-files' },
                { label: 'CF Analytics', href: 'https://dash.cloudflare.com/39b9b9435d78643309d3e2119ba21151/ukrbooks.ink/analytics/traffic' },
                { label: 'Vercel', href: 'https://vercel.com/volikovvv-1506s-projects/ukrbooks' },
                { label: 'Upstash', href: 'https://console.upstash.com' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-center text-slate-300 hover:text-white transition-colors border border-white/10"
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
