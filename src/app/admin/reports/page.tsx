'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Report {
  caseId: string;
  type: string;
  url: string;
  email: string;
  name?: string;
  description: string;
  bookTitle?: string | null;
  ip?: string;
  ua?: string;
  ts: number;
  status: 'open' | 'resolved' | 'rejected';
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  copyright: { label: 'Авторські права', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  incorrect_metadata: { label: 'Метадані', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  broken_file: { label: 'Файл', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  bad_quality: { label: 'Якість', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  other: { label: 'Інше', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: 'Відкрита', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  resolved: { label: 'Вирішена', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Відхилена', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'rejected'>('open');
  const [selected, setSelected] = useState<Report | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      setReports(data.reports || []);
      setConfigured(data.configured ?? true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  async function updateStatus(caseId: string, status: 'open' | 'resolved' | 'rejected') {
    const res = await fetch(`/api/admin/reports/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.caseId === caseId ? { ...r, status } : r)));
      if (selected?.caseId === caseId) setSelected({ ...selected, status });
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  const countByStatus = {
    open: reports.filter((r) => r.status === 'open').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">🚩 Скарги</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Звернення від користувачів та правовласників</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs sm:text-sm text-slate-300 shrink-0"
        >
          ↻ Оновити
        </button>
      </div>

      {!configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-300">
          ⚠️ Upstash Redis не налаштовано — скарги не зберігаються.
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['open', 'resolved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {f === 'all'
              ? `Усі (${reports.length})`
              : f === 'open'
              ? `Відкриті (${countByStatus.open})`
              : f === 'resolved'
              ? `Вирішені (${countByStatus.resolved})`
              : `Відхилені (${countByStatus.rejected})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-[#1e293b] border border-white/10 rounded-2xl p-8 sm:p-10 text-center text-slate-400">
          <div className="text-4xl mb-3 opacity-50">📭</div>
          <p className="text-sm">Немає скарг у цій категорії</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => {
            const typeInfo = TYPE_LABEL[r.type] || TYPE_LABEL.other;
            const statusInfo = STATUS_LABEL[r.status];
            return (
              <button
                key={r.caseId}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-[#1e293b] hover:bg-[#243247] border border-white/10 rounded-xl p-3 sm:p-4 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <code className="font-mono text-[10px] sm:text-xs text-slate-400">{r.caseId}</code>
                  <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-sm text-white line-clamp-2 mb-0.5">
                  {r.bookTitle || r.url}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {r.email} · {new Date(r.ts).toLocaleString('uk-UA')}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 flex items-start justify-center p-3 sm:p-6 overflow-y-auto z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <code className="font-mono text-xs sm:text-sm text-slate-400">{selected.caseId}</code>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1 break-words">{selected.bookTitle || 'Без назви'}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-2xl leading-none shrink-0">×</button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${TYPE_LABEL[selected.type]?.color || TYPE_LABEL.other.color}`}>
                {TYPE_LABEL[selected.type]?.label || selected.type}
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${STATUS_LABEL[selected.status].color}`}>
                {STATUS_LABEL[selected.status].label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Від</div>
                <div className="text-white break-words">{selected.name || '—'}</div>
                <a href={`mailto:${selected.email}`} className="text-blue-400 hover:underline text-xs break-all">{selected.email}</a>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Коли</div>
                <div className="text-white">{new Date(selected.ts).toLocaleString('uk-UA')}</div>
                <div className="text-xs text-slate-400">IP: <code className="font-mono">{selected.ip || '—'}</code></div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Сторінка</div>
              <Link href={selected.url} target="_blank" className="text-blue-400 hover:underline text-xs sm:text-sm break-all">
                {selected.url} ↗
              </Link>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Опис</div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap break-words">
                {selected.description}
              </div>
            </div>

            {selected.ua && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">User-Agent</div>
                <code className="text-[10px] sm:text-[11px] text-slate-400 font-mono break-all">{selected.ua}</code>
              </div>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-white/10 flex-wrap">
              <button
                onClick={() => updateStatus(selected.caseId, 'resolved')}
                disabled={selected.status === 'resolved'}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50"
              >
                ✓ Вирішено
              </button>
              <button
                onClick={() => updateStatus(selected.caseId, 'rejected')}
                disabled={selected.status === 'rejected'}
                className="px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-300 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50"
              >
                ✕ Відхилити
              </button>
              {selected.status !== 'open' && (
                <button
                  onClick={() => updateStatus(selected.caseId, 'open')}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg text-xs sm:text-sm"
                >
                  ↶ Відкрити
                </button>
              )}
              <a
                href={`mailto:${selected.email}?subject=Re: ${selected.caseId}`}
                className="sm:ml-auto px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs sm:text-sm font-semibold"
              >
                ✉ Написати
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
