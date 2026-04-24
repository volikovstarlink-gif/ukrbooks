'use client';
import { useEffect, useState } from 'react';
import StatCard from '@/components/admin/StatCard';
import UsageBar from '@/components/admin/UsageBar';
import ErrorsList, { type ErrorEvent } from '@/components/admin/ErrorsList';

interface StorageData {
  totalGB: number;
  fileCount: number;
  source: string;
  note: string | null;
  limitGB: number;
  warnThresholdGB: number;
  percent: number;
  severity: 'ok' | 'warn' | 'critical';
  warnings: ErrorEvent[];
}

const SOURCE_LABEL: Record<string, string> = {
  'r2-api': 'Cloudflare R2 API',
  'local-fs': 'Локальна файлова система (dev)',
  'fallback': 'Резервні дані',
};

export default function StoragePage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/storage');
        if (!res.ok) throw new Error('fail');
        setData(await res.json());
      } catch {
        setError('Не вдалося завантажити дані');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">☁️ Сховище</h1>
        <p className="text-slate-400 text-xs sm:text-sm">Cloudflare R2 — моніторинг використаного місця та ліміту</p>
      </div>

      {loading && <div className="bg-[#1e293b] rounded-2xl p-4 h-32 animate-pulse border border-white/10" />}
      {error && <p className="text-red-400 bg-red-500/10 rounded-xl p-3 sm:p-4 text-sm">{error}</p>}

      {data && !loading && (
        <>
          {data.severity === 'critical' && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 sm:p-5 text-red-200">
              <h3 className="font-bold text-sm sm:text-base mb-1">🚨 Перевищено ліміт сховища!</h3>
              <p className="text-xs sm:text-sm opacity-90">
                Зайнято {data.totalGB} ГБ з {data.limitGB} ГБ ({data.percent}%). Нові аплоади можуть перестати працювати.
                Терміново видаліть старі файли або підвищте тариф.
              </p>
            </div>
          )}
          {data.severity === 'warn' && (
            <div className="bg-yellow-500/15 border border-yellow-500/40 rounded-xl p-4 sm:p-5 text-yellow-200">
              <h3 className="font-bold text-sm sm:text-base mb-1">⚠️ Наближаємось до ліміту</h3>
              <p className="text-xs sm:text-sm opacity-90">
                Зайнято {data.totalGB} ГБ з {data.limitGB} ГБ ({data.percent}%). Плануйте чистку сховища.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Зайнято"
              value={`${data.totalGB} GB`}
              color={data.severity === 'critical' ? 'text-red-400' : data.severity === 'warn' ? 'text-yellow-400' : 'text-emerald-400'}
              icon="💾"
              size="lg"
              sub={`${data.percent.toFixed(1)}%`}
            />
            <StatCard
              label="Ліміт"
              value={`${data.limitGB} GB`}
              color="text-slate-300"
              icon="🎯"
              sub="Cloudflare R2 Free Tier"
            />
            <StatCard
              label="Файлів у бакеті"
              value={data.fileCount.toLocaleString('uk-UA')}
              color="text-blue-400"
              icon="📁"
            />
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 border border-white/10 space-y-4">
            <h3 className="font-semibold text-slate-200 text-sm sm:text-base">Використання сховища</h3>
            <UsageBar used={data.totalGB} max={data.limitGB} label="R2 storage" unit=" GB" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-xs">Джерело даних</span>
                <span className="text-slate-200 text-sm">{SOURCE_LABEL[data.source] ?? data.source}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-xs">Поріг попередження</span>
                <span className="text-slate-200 text-sm">{data.warnThresholdGB} GB</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-xs">Reads / місяць (Free)</span>
                <span className="text-slate-200 text-sm">10&nbsp;000&nbsp;000</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-xs">Writes / місяць (Free)</span>
                <span className="text-slate-200 text-sm">1&nbsp;000&nbsp;000</span>
              </div>
            </div>
            {data.note && <p className="text-yellow-400/70 text-xs">{data.note}</p>}
          </div>

          <ErrorsList title="Історія попереджень" items={data.warnings} empty="Попереджень немає ✓" />
        </>
      )}
    </div>
  );
}
