'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import DateRangeControl from '@/components/admin/DateRangeControl';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';
import {
  type DateRange,
  formatRangeLabel,
  presetToRange,
  rangeToQueryString,
} from '@/lib/admin-range';

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

// Label map for ad-network groupings. We only surface SSPs the site
// actually uses. Adsterra was removed from the codebase (commit e037b674);
// Monetag's service-worker-push flow was dropped too (kill-monetag-sw…).
// Any stray legacy events from those networks fall through to 'other' now
// so old metadata can't disguise itself as a live revenue channel.
const GROUP_LABELS: Record<string, string> = {
  hilltopads: 'HilltopAds',
  medianet: 'Media.net',
  house: 'House ads (власні)',
  vast: 'VAST (відео)',
  gate: 'Ad Gate',
  other: 'Інше',
};

function groupKey(network: string): string {
  const n = network.toLowerCase();
  if (n.startsWith('hilltopads') || n === 'hilltopads' || n.startsWith('hilltop')) return 'hilltopads';
  if (n.startsWith('medianet')) return 'medianet';
  if (n.startsWith('house_') || n.startsWith('house-')) return 'house';
  if (n.startsWith('vast') || n.includes('_vast')) return 'vast';
  if (n === 'gate') return 'gate';
  return 'other';
}

interface AdsData {
  preset: string;
  since: string;
  until: string;
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
  byNetwork: Record<string, NetworkStats>;
  errors: ErrorEvent[];
}

export default function AdsPage() {
  const [range, setRange] = useState<DateRange>(() => presetToRange('7d'));
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);

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
      const res = await fetch(`/api/admin/analytics/ads?${rangeToQueryString(range)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'fail');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося завантажити дані');
    } finally {
      setLoading(false);
    }
  }, [range]);

  async function handleCleanStale() {
    if (!confirm('Видалити старі рекламні мережі (Adsterra, MGID, обрізані імена)? Реальні лічильники HilltopAds/house залишаться.')) return;
    setCleaning(true);
    setCleanMsg(null);
    try {
      const res = await fetch('/api/admin/analytics/reset?scope=ads-networks-stale', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCleanMsg(`❌ Помилка: ${body.error ?? res.status}`);
      } else {
        setCleanMsg(`✅ Видалено ${body.removed ?? 0} мереж, ${body.keysDeleted ?? 0} лічильників`);
        fetchData();
      }
    } catch (e) {
      setCleanMsg(`❌ Мережа: ${String(e)}`);
    } finally {
      setCleaning(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const label = formatRangeLabel(range);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">💰 Реклама</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Покази, кліки, CTR по рекламних мережах</p>
        </div>
        <DateRangeControl value={range} onChange={setRange} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-300">
          ⚠️ Upstash Redis не налаштовано — події реклами не записуються.
        </div>
      )}

      {loading && (
        <div className="bg-[#1e293b] rounded-2xl p-4 h-24 animate-pulse border border-white/10" />
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-3 sm:p-4 text-sm">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={`Покази · ${label}`}
              value={data.totals.impressions.toLocaleString('uk-UA')}
              color="text-blue-400"
              icon="👁️"
            />
            <StatCard
              label={`Кліки · ${label}`}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              sub="VAST без реклами"
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
            data={data.byDay.map(d => ({ ...d, date: d.date.slice(5) }))}
            xKey="date"
            series={[
              { dataKey: 'impressions', label: 'Покази', color: '#60a5fa' },
              { dataKey: 'clicks', label: 'Кліки', color: '#34d399' },
              { dataKey: 'errors', label: 'Помилки', color: '#f87171' },
            ]}
          />

          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-semibold text-slate-200 text-sm sm:text-base">📊 По мережах</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanStale}
                  disabled={cleaning}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-50"
                  title="Видалити Adsterra, MGID, обрізані імена з історії"
                >
                  {cleaning ? 'Чищу…' : '🧹 Очистити старі'}
                </button>
                <p className="text-[11px] text-slate-500">
                  Кліки по iframe-банерах — приблизно (blur евристика).
                </p>
              </div>
            </div>
            {cleanMsg && <p className="text-[11px] text-slate-300 mb-2">{cleanMsg}</p>}
            {groups.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Немає даних про рекламні мережі</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
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
                                {hasDetails ? (
                                  <span className="inline-block w-4 text-slate-500">{open ? '▾' : '▸'}</span>
                                ) : (
                                  <span className="inline-block w-4" />
                                )}
                                {g.label}
                                <span className="ml-2 text-xs text-slate-500">
                                  {g.placements.length} {g.placements.length === 1 ? 'розміщення' : 'розміщень'}
                                </span>
                              </td>
                              <td className="text-right py-2 pr-4 text-blue-400 tabular-nums">{g.impressions.toLocaleString('uk-UA')}</td>
                              <td className="text-right py-2 pr-4 text-emerald-400 tabular-nums">{g.clicks.toLocaleString('uk-UA')}</td>
                              <td className="text-right py-2 pr-4 text-cyan-400 tabular-nums">{g.ctr.toFixed(2)}%</td>
                              <td className={`text-right py-2 tabular-nums ${g.errors > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {g.errors.toLocaleString('uk-UA')}
                              </td>
                            </tr>
                            {open &&
                              g.placements.map(p => (
                                <tr key={`${g.key}:${p.name}`} className="border-b border-white/5 bg-white/[0.02]">
                                  <td className="py-1.5 pr-4 pl-8 text-slate-400 text-xs font-mono break-all">{p.name}</td>
                                  <td className="text-right py-1.5 pr-4 text-blue-400/80 text-xs tabular-nums">{p.impressions.toLocaleString('uk-UA')}</td>
                                  <td className="text-right py-1.5 pr-4 text-emerald-400/80 text-xs tabular-nums">{p.clicks.toLocaleString('uk-UA')}</td>
                                  <td className="text-right py-1.5 pr-4 text-cyan-400/80 text-xs tabular-nums">{p.ctr.toFixed(2)}%</td>
                                  <td className={`text-right py-1.5 text-xs tabular-nums ${p.errors > 0 ? 'text-red-400/80' : 'text-slate-600'}`}>
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
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {groups.map(g => {
                    const open = expanded[g.key] ?? false;
                    const hasDetails = g.placements.length > 1;
                    return (
                      <div key={g.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div
                          className={`flex items-center justify-between gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
                          onClick={() => hasDetails && setExpanded(s => ({ ...s, [g.key]: !open }))}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-200 text-sm">
                              {hasDetails && <span className="mr-1 text-slate-500">{open ? '▾' : '▸'}</span>}
                              {g.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {g.placements.length} {g.placements.length === 1 ? 'розміщення' : 'розміщень'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-cyan-400 text-sm font-semibold tabular-nums">{g.ctr.toFixed(2)}%</div>
                            <div className="text-[11px] text-slate-500">CTR</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5 text-xs">
                          <div>
                            <div className="text-slate-500">Покази</div>
                            <div className="text-blue-400 tabular-nums">{g.impressions.toLocaleString('uk-UA')}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Кліки</div>
                            <div className="text-emerald-400 tabular-nums">{g.clicks.toLocaleString('uk-UA')}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Помилки</div>
                            <div className={`tabular-nums ${g.errors > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                              {g.errors.toLocaleString('uk-UA')}
                            </div>
                          </div>
                        </div>
                        {open && hasDetails && (
                          <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                            {g.placements.map(p => (
                              <div key={p.name} className="flex items-center justify-between gap-2 text-[11px]">
                                <div className="font-mono text-slate-400 break-all min-w-0">{p.name}</div>
                                <div className="text-right shrink-0">
                                  <span className="text-blue-400/80 tabular-nums">{p.impressions.toLocaleString('uk-UA')}</span>
                                  <span className="text-slate-600"> · </span>
                                  <span className="text-cyan-400/80 tabular-nums">{p.ctr.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <ErrorsList title="Помилки реклами (VAST, ad-block, network)" items={data.errors} />
        </>
      )}
    </div>
  );
}
