'use client';
import { useCallback, useEffect, useState } from 'react';
import DateRangeControl from '@/components/admin/DateRangeControl';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import BarChartCard from '@/components/admin/BarChartCard';
import DataTable, { type DataColumn } from '@/components/admin/DataTable';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';
import {
  type DateRange,
  formatRangeLabel,
  presetToRange,
  rangeToQueryString,
} from '@/lib/admin-range';

interface DownloadRow {
  ts: number;
  slug?: string;
  title?: string;
  format?: string;
}

interface DownloadsData {
  preset: string;
  since: string;
  until: string;
  configured: boolean;
  total: number;
  byDay: Array<{ date: string; value: number }>;
  topBooks: Array<{ slug: string; title: string; count: number }>;
  recent: DownloadRow[];
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

const RECENT_COLUMNS: DataColumn<DownloadRow>[] = [
  {
    key: 'ts',
    header: 'Час',
    cell: r => <span className="text-slate-400 whitespace-nowrap">{formatTs(r.ts)}</span>,
  },
  {
    key: 'title',
    header: 'Книга',
    cell: r => <span className="text-slate-200 line-clamp-2">{r.title || r.slug || '—'}</span>,
  },
  {
    key: 'format',
    header: 'Формат',
    cell: r => <span className="text-slate-300 uppercase text-xs">{r.format || '—'}</span>,
  },
];

export default function DownloadsPage() {
  const [range, setRange] = useState<DateRange>(() => presetToRange('7d'));
  const [data, setData] = useState<DownloadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics/downloads?${rangeToQueryString(range)}`);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const label = formatRangeLabel(range);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">📥 Скачування</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Лічильники, топ книг та помилки завантажень</p>
        </div>
        <DateRangeControl value={range} onChange={setRange} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-300">
          ⚠️ Upstash Redis не налаштовано — лічильники не збираються.
        </div>
      )}

      {loading && (
        <div className="bg-[#1e293b] rounded-2xl p-4 h-24 animate-pulse border border-white/10" />
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-3 sm:p-4 text-sm">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label={`Всього скачувань · ${label}`}
              value={data.total.toLocaleString('uk-UA')}
              color="text-emerald-400"
              icon="📥"
              size="lg"
            />
            <StatCard
              label="Книг у топі"
              value={data.topBooks.length}
              color="text-blue-400"
              icon="📚"
              sub="за весь час"
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
            data={data.byDay.map(d => ({ ...d, date: d.date.slice(5) }))}
            xKey="date"
            series={[{ dataKey: 'value', label: 'Скачувань', color: '#34d399' }]}
          />

          <BarChartCard
            title="🏆 Топ-20 книг (за весь час)"
            data={data.topBooks.map(b => ({ label: b.title || b.slug, value: b.count }))}
            color="#60a5fa"
            layout="vertical"
            empty="Поки немає скачувань"
          />

          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
            <h3 className="font-semibold mb-3 text-slate-200 text-sm sm:text-base">🕒 Останні скачування</h3>
            <DataTable
              columns={RECENT_COLUMNS}
              rows={data.recent}
              getRowKey={(r, i) => `${r.ts}-${i}`}
              empty="Поки порожньо"
              mobileCard={r => (
                <div className="space-y-1">
                  <div className="text-sm text-slate-200 line-clamp-2">{r.title || r.slug || '—'}</div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{formatTs(r.ts)}</span>
                    <span className="uppercase">{r.format || '—'}</span>
                  </div>
                </div>
              )}
            />
          </div>

          <ErrorsList title="Помилки скачувань" items={data.errors} />
        </>
      )}
    </div>
  );
}
