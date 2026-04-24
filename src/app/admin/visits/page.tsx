'use client';
import { useCallback, useEffect, useState } from 'react';
import DateRangeControl from '@/components/admin/DateRangeControl';
import StatCard from '@/components/admin/StatCard';
import LineChartCard from '@/components/admin/LineChartCard';
import DataTable, { type DataColumn } from '@/components/admin/DataTable';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';
import {
  type DateRange,
  formatRangeLabel,
  presetToRange,
  rangeToQueryString,
} from '@/lib/admin-range';

interface VisitsData {
  preset: string;
  since: string;
  until: string;
  configured: boolean;
  totals: { visits: number; unique: number };
  byDay: Array<{ date: string; visits: number; unique: number }>;
  errors: ErrorEvent[];
}

type Row = { date: string; visits: number; unique: number };

const COLUMNS: DataColumn<Row>[] = [
  { key: 'date', header: 'Дата', cell: r => <span className="text-slate-300">{r.date}</span> },
  {
    key: 'unique',
    header: 'Унікальні',
    align: 'right',
    cell: r => <span className="text-blue-400 tabular-nums">{r.unique.toLocaleString('uk-UA')}</span>,
  },
  {
    key: 'visits',
    header: 'Перегляди',
    align: 'right',
    cell: r => <span className="text-purple-400 tabular-nums">{r.visits.toLocaleString('uk-UA')}</span>,
  },
];

export default function VisitsPage() {
  const [range, setRange] = useState<DateRange>(() => presetToRange('7d'));
  const [data, setData] = useState<VisitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics/visits?${rangeToQueryString(range)}`);
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
          <h1 className="text-xl sm:text-2xl font-bold">👥 Відвідування</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Статистика переглядів та унікальних користувачів</p>
        </div>
        <DateRangeControl value={range} onChange={setRange} />
      </div>

      {data && !data.configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-300">
          ⚠️ <strong>Upstash Redis не налаштовано.</strong> Додайте
          <code className="bg-yellow-500/20 px-1 rounded mx-1">UPSTASH_REDIS_REST_URL</code> та
          <code className="bg-yellow-500/20 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code> у середовище.
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-2xl p-4 h-24 animate-pulse border border-white/10" />
          ))}
        </div>
      )}

      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-3 sm:p-4 text-sm">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard
              label={`Унікальні відвідувачі · ${label}`}
              value={data.totals.unique.toLocaleString('uk-UA')}
              color="text-blue-400"
              icon="👤"
              size="lg"
            />
            <StatCard
              label={`Перегляди сторінок · ${label}`}
              value={data.totals.visits.toLocaleString('uk-UA')}
              color="text-purple-400"
              icon="📄"
              size="lg"
            />
          </div>

          <LineChartCard
            title="Динаміка по днях"
            data={data.byDay.map(d => ({ ...d, date: d.date.slice(5) }))}
            xKey="date"
            series={[
              { dataKey: 'unique', label: 'Унікальні', color: '#60a5fa' },
              { dataKey: 'visits', label: 'Перегляди', color: '#c084fc' },
            ]}
          />

          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10">
            <h3 className="font-semibold mb-3 text-slate-200 text-sm sm:text-base">По днях</h3>
            <DataTable
              columns={COLUMNS}
              rows={data.byDay}
              getRowKey={(r) => r.date}
              empty="Немає даних за цей період"
            />
          </div>

          <ErrorsList title="Помилки відвідувань" items={data.errors} />
        </>
      )}
    </div>
  );
}
