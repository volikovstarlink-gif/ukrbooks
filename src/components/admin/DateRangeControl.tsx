'use client';
import { useState } from 'react';
import {
  type DateRange,
  type RangePreset,
  presetToRange,
  todayISO,
  addDays,
  isValidISO,
  MAX_RANGE_DAYS,
  daysBetween,
} from '@/lib/admin-range';

const PRESET_BUTTONS: Array<{ key: RangePreset; label: string }> = [
  { key: 'today', label: 'Сьогодні' },
  { key: '7d', label: '7 днів' },
  { key: '30d', label: '30 днів' },
  { key: 'custom', label: 'Свій період' },
];

export default function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [customSince, setCustomSince] = useState(value.since);
  const [customUntil, setCustomUntil] = useState(value.until);
  const [error, setError] = useState('');

  function pickPreset(preset: RangePreset) {
    setError('');
    if (preset === 'custom') {
      const next = presetToRange('custom', customSince, customUntil);
      setCustomSince(next.since);
      setCustomUntil(next.until);
      onChange(next);
      return;
    }
    const next = presetToRange(preset);
    setCustomSince(next.since);
    setCustomUntil(next.until);
    onChange(next);
  }

  function applyCustom(nextSince: string, nextUntil: string) {
    if (!isValidISO(nextSince) || !isValidISO(nextUntil)) {
      setError('Невірна дата');
      return;
    }
    if (nextSince > nextUntil) {
      setError('Дата «від» має бути раніше ніж «до»');
      return;
    }
    if (daysBetween(nextSince, nextUntil) > MAX_RANGE_DAYS) {
      setError(`Максимум ${MAX_RANGE_DAYS} днів`);
      return;
    }
    setError('');
    onChange({ preset: 'custom', since: nextSince, until: nextUntil });
  }

  const today = todayISO();
  const minDate = addDays(today, -(MAX_RANGE_DAYS - 1));
  const isCustom = value.preset === 'custom';

  return (
    <div className="w-full sm:w-auto">
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_BUTTONS.map(p => (
          <button
            key={p.key}
            onClick={() => pickPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              value.preset === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-400 w-8 shrink-0">від</label>
            <input
              type="date"
              value={customSince}
              min={minDate}
              max={today}
              onChange={e => {
                setCustomSince(e.target.value);
                applyCustom(e.target.value, customUntil);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm text-slate-200 w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-400 w-8 shrink-0">до</label>
            <input
              type="date"
              value={customUntil}
              min={minDate}
              max={today}
              onChange={e => {
                setCustomUntil(e.target.value);
                applyCustom(customSince, e.target.value);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm text-slate-200 w-full sm:w-auto"
            />
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
