'use client';
import { useEffect, useState } from 'react';

interface StorageInfo {
  totalGB: number;
  limitGB: number;
  severity: 'ok' | 'warn' | 'critical';
  percent: number;
}

export default function GlobalAlert() {
  const [info, setInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    fetch('/api/admin/storage')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setInfo(data);
      })
      .catch(() => {});
  }, []);

  if (!info || info.severity === 'ok') return null;

  const isCritical = info.severity === 'critical';
  return (
    <div
      className={`border-b px-3 sm:px-5 py-2.5 text-xs sm:text-sm ${
        isCritical
          ? 'bg-red-500/15 border-red-500/40 text-red-200'
          : 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200'
      }`}
    >
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 max-w-6xl mx-auto">
        <span className="text-lg sm:text-xl shrink-0 leading-none mt-0.5 sm:mt-0">{isCritical ? '🚨' : '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">
            {isCritical
              ? `Сховище перевищено: ${info.totalGB} / ${info.limitGB} ГБ`
              : `Сховище ${info.percent}%: ${info.totalGB} / ${info.limitGB} ГБ`}
          </div>
          <div className="opacity-80 text-[11px] sm:text-xs">
            {isCritical ? 'Потрібно звільнити місце або підвищити ліміт.' : 'Плануйте чистку або апгрейд.'}
          </div>
        </div>
        <a
          href="/admin/storage"
          className="underline text-xs opacity-90 hover:opacity-100 shrink-0"
        >
          Деталі →
        </a>
      </div>
    </div>
  );
}
