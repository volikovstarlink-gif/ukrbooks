'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import PeriodSwitcher, { type Period, PERIOD_LABELS } from '@/components/admin/PeriodSwitcher';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';

type NetworkStats = { impressions: number; clicks: number; errors: number; ctr: number };
type PlacementRow = NetworkStats & { name: string };
type GroupRow = {
  key: string;
  label: string;
  impressions: number;
  clicks: number;
  errors: number;
  ctr: number;
  placements: PlacementRow[];
};

const GROUP_LABELS: Record<string, string> = {
  adsterra: 'Adsterra',
  hilltopads: 'HilltopAds',
  medianet: 'Media.net',
  house: 'House ads (власні)',
  vast: 'VAST (відео)',
  gate: 'Ad Gate',
  monetag: 'Monetag',
  other: 'Інше',
};

function groupKey(network: string): string {
  const n = network.toLowerCase();
  if (n.startsWith('adsterra')) return 'adsterra';
  if (n.startsWith('hilltopads') || n === 'hilltopads' || n.startsWith('hilltop')) return 'hilltopads';
  if (n.startsWith('medianet')) return 'medianet';
  if (n.startsWith('house_') || n.startsWith('house-')) return 'house';
  if (n.startsWith('vast') || n.includes('_vast')) return 'vast';
  if (n === 'gate') return 'gate';
  if (n === 'monetag') return 'monetag';
  return 'other';
}

interface AdsData {
  period: Period;
  configured: boolean;
  networks: string[];
  totals: {
    impressions: number;
    clicks: number;
    errors: number;
    nofill: number;
    gateOpens: number;
    downloadsCompleted: number;
    ctr: number;
  };
  byDay: Array<{ date: string; impressions: number; clicks: number; errors: number }>;
  byNetwork: Record<string, { impressions: number; clicks: number; errors: number; ctr: number }>;
  errors: ErrorEvent[];
}

export default function AdsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo<GroupRow[]>(() => {
    if (!data) return [];
    const acc: Record<string, GroupRow> = {};
    for (const n of data.networks) {
      const key = groupKey(n);
      const s = data.byNetwork[n];
      if (!s) continue;
      if (!acc[key]) {
        acc[key] = {
          key,
          label: GROUP_LABELS[key] ?? key,
          impressions: 0,
          clicks: 0,
          errors: 0,
          ctr: 0,
          placements: [],
        };
      }
      acc[key].impressions += s.impressions;
      acc[key].clicks += s.clicks;
      acc[key].errors += s.errors;
      acc[key].placements.push({ name: n, ...s });
    }
    for (const g of Object.values(acc)) {
      g.ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
      g.placements.sort((a, b) => b.impressions - a.impressions);
    }
    return Object.values(acc).sort((a, b) => b.impressions - a.impressions);
  }, [data]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics/ads?period=${period}`);
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
          <h1 className="text-2xl font-bold">💰 Реклама</h1>
          <p className="text-slate-400 text-sm">Покази, кліки, CTR та помилки по рекламних мережах</p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
          ⚠️ Upstash Redis не налаштовано — події реклами не записуються.
        </div>
      )}

      {loading && (
        <div className="bg-[#1e293b] rounded-2xl p-6 h-24 animate-pulse border border-white/10" />
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-4">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={`Покази (${PERIOD_LABELS[period]})`}
              value={data.totals.impressions.toLocaleString('uk-UA')}
              color="text-blue-400"
              icon="👁️"
            />
            <StatCard
              label={`Кліки (${PERIOD_LABELS[period]})`}
              value={data.totals.clicks.toLocaleString('uk-UA')}
              color="text-emerald-400"
              icon="🖱️"
            />
            <StatCard
              label="CTR"
              value={`${data.totals.ctr}%`}
              color="text-cyan-400"
              icon="📈"
            />
            <StatCard
              label="Помилки"
              value={data.totals.errors.toLocaleString('uk-UA')}
              color={data.totals.errors > 0 ? 'text-red-400' : 'text-slate-400'}
              icon="⚠️"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Ad Gate відкриттів"
              value={data.totals.gateOpens.toLocaleString('uk-UA')}
              color="text-purple-400"
              sub="кліків на 'Завантажити'"
            />
            <StatCard
              label="Відкатів (no-fill)"
              value={data.totals.nofill.toLocaleString('uk-UA')}
              color="text-yellow-400"
              sub="коли VAST не знайшов рекламу"
            />
            <StatCard
              label="Завершених завантажень"
              value={data.totals.downloadsCompleted.toLocaleString('uk-UA')}
              color="text-emerald-400"
              sub="після перегляду реклами"
            />
          </div>

          <LineChartCard
            title="Динаміка показів та кліків"
            data={data.byDay}
            xKey="date"
            series={[
              { dataKey: 'impressions', label: 'Покази', color: '#60a5fa' },
              { dataKey: 'clicks', label: 'Кліки', color: '#34d399' },
              { dataKey: 'errors', label: 'Помилки', color: '#f87171' },
            ]}
          />

          <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-slate-200">📊 По мережах</h3>
              <p className="text-xs text-slate-500">
                Кліки за iframe-банерами — приблизно (евристика blur). Точні цифри в дашбордах рекламних мереж.
              </p>
            </div>
            {groups.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Немає даних про рекламні мережі</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="text-left py-2 pr-4">Мережа</th>
                      <th className="text-right py-2 pr-4">Покази</th>
                      <th className="text-right py-2 pr-4">Кліки</th>
                      <th className="text-right py-2 pr-4">CTR</th>
                      <th className="text-right py-2">Помилки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => {
                      const open = expanded[g.key] ?? false;
                      const hasDetails = g.placements.length > 1;
                      return (
                        <Fragment key={g.key}>
                          <tr
                            className={`border-b border-white/5 ${hasDetails ? 'cursor-pointer hover:bg-white/5' : ''}`}
                            onClick={() => hasDetails && setExpanded(s => ({ ...s, [g.key]: !open }))}
                          >
                            <td className="py-2 pr-4 text-slate-200 font-medium">
                              {hasDetails && (
                                <span className="inline-block w-4 text-slate-500">{open ? '▾' : '▸'}</span>
                              )}
                              {!hasDetails && <span className="inline-block w-4" />}
                              {g.label}
                              <span className="ml-2 text-xs text-slate-500">
                                {g.placements.length} {g.placements.length === 1 ? 'розміщення' : 'розміщень'}
                              </span>
                            </td>
                            <td className="text-right py-2 pr-4 text-blue-400">{g.impressions.toLocaleString('uk-UA')}</td>
                            <td className="text-right py-2 pr-4 text-emerald-400">{g.clicks.toLocaleString('uk-UA')}</td>
                            <td className="text-right py-2 pr-4 text-cyan-400">{g.ctr.toFixed(2)}%</td>
                            <td className={`text-right py-2 ${g.errors > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                              {g.errors.toLocaleString('uk-UA')}
                            </td>
                          </tr>
                          {open &&
                            g.placements.map(p => (
                              <tr key={`${g.key}:${p.name}`} className="border-b border-white/5 bg-white/[0.02]">
                                <td className="py-1.5 pr-4 pl-8 text-slate-400 text-xs font-mono break-all">{p.name}</td>
                                <td className="text-right py-1.5 pr-4 text-blue-400/80 text-xs">{p.impressions.toLocaleString('uk-UA')}</td>
                                <td className="text-right py-1.5 pr-4 text-emerald-400/80 text-xs">{p.clicks.toLocaleString('uk-UA')}</td>
                                <td className="text-right py-1.5 pr-4 text-cyan-400/80 text-xs">{p.ctr.toFixed(2)}%</td>
                                <td className={`text-right py-1.5 text-xs ${p.errors > 0 ? 'text-red-400/80' : 'text-slate-600'}`}>
                                  {p.errors.toLocaleString('uk-UA')}
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ErrorsList title="Помилки реклами (VAST, ad-block, network)" items={data.errors} />
        </>
      )}
    </div>
  );
}
