'use client';

export interface ErrorEvent {
  ts?: number;
  severity?: string;
  message?: string;
  [k: string]: unknown;
}

function severityClass(sev?: string): string {
  if (sev === 'critical') return 'text-red-300 bg-red-500/15 border-red-500/40';
  if (sev === 'warn') return 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40';
  return 'text-slate-300 bg-white/5 border-white/10';
}

function formatTs(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  try {
    return new Date(ts).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return '—';
  }
}

interface ErrorsListProps {
  title?: string;
  items: ErrorEvent[];
  empty?: string;
}

export default function ErrorsList({ title = 'Помилки', items, empty = 'Помилок не зафіксовано ✓' }: ErrorsListProps) {
  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200">⚠️ {title}</h3>
        <span className="text-xs text-slate-500">{items.length} {items.length === 0 ? 'записів' : items.length < 5 ? 'записи' : 'записів'}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm py-4 text-center">{empty}</p>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {items.map((item, i) => {
            const sev = typeof item.severity === 'string' ? item.severity : undefined;
            const { ts, severity, message, ...ctx } = item;
            void severity;
            const ctxEntries = Object.entries(ctx).filter(([k]) => k !== 'ts' && k !== 'severity');
            return (
              <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${severityClass(sev)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {message && <p className="font-medium mb-0.5 break-words">{String(message)}</p>}
                    {ctxEntries.length > 0 && (
                      <p className="text-xs opacity-80 break-all">
                        {ctxEntries.map(([k, v]) => (
                          <span key={k} className="mr-3">
                            <span className="opacity-60">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <span className="text-xs opacity-70 shrink-0 whitespace-nowrap">{formatTs(ts)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
