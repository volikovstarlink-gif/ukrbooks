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
      className={`border-b px-6 py-3 text-sm flex items-center gap-3 ${
        isCritical
          ? 'bg-red-500/15 border-red-500/40 text-red-200'
          : 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200'
      }`}
    >
      <span className="text-xl">{isCritical ? '🚨' : '⚠️'}</span>
      <div className="flex-1">
        <strong className="mr-2">
          {isCritical
            ? `Сховище перевищило ліміт ${info.limitGB} ГБ!`
            : `Сховище майже повне: ${info.totalGB} ГБ з ${info.limitGB} ГБ`}
        </strong>
        <span className="opacity-80">
          Заповнено на {info.percent}%. {isCritical ? 'Потрібно терміново звільнити місце або підвищити ліміт.' : 'Плануйте чистку або апгрейд.'}
        </span>
      </div>
      <a href="/admin/storage" className="underline text-xs opacity-80 hover:opacity-100">
        Деталі →
      </a>
    </div>
  );
}
