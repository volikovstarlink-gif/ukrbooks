'use client';

export type Period = '1d' | '7d' | '30d';

const LABELS: Record<Period, string> = { '1d': '24 години', '7d': '7 днів', '30d': '30 днів' };

export default function PeriodSwitcher({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex gap-2">
      {(['1d', '7d', '30d'] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  );
}

export { LABELS as PERIOD_LABELS };
