import { NextResponse } from 'next/server';

export type RangePreset = 'today' | '7d' | '30d' | 'custom';

export interface DateRange {
  preset: RangePreset;
  since: string;
  until: string;
}

export const MAX_RANGE_DAYS = 90;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return toISO(d);
}

export function presetToRange(preset: RangePreset, customSince?: string, customUntil?: string): DateRange {
  const today = todayISO();
  if (preset === 'today') return { preset, since: today, until: today };
  if (preset === '7d') return { preset, since: addDays(today, -6), until: today };
  if (preset === '30d') return { preset, since: addDays(today, -29), until: today };
  const since = customSince && isValidISO(customSince) ? customSince : addDays(today, -6);
  const until = customUntil && isValidISO(customUntil) ? customUntil : today;
  return { preset: 'custom', since, until };
}

export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && toISO(d) === s;
}

export function daysBetween(since: string, until: string): number {
  const a = new Date(`${since}T00:00:00Z`);
  const b = new Date(`${until}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function parseRangeFromSearchParams(params: URLSearchParams): DateRange | { error: string } {
  const since = params.get('since');
  const until = params.get('until');
  if (since || until) {
    if (!since || !until) return { error: 'Потрібно вказати обидва параметри since та until' };
    if (!isValidISO(since) || !isValidISO(until)) return { error: 'Формат дати має бути YYYY-MM-DD' };
    if (since > until) return { error: 'since має бути <= until' };
    const days = daysBetween(since, until);
    if (days > MAX_RANGE_DAYS) return { error: `Максимальний діапазон ${MAX_RANGE_DAYS} днів (дані старіші не зберігаються)` };
    return { preset: 'custom', since, until };
  }
  const period = params.get('period') || '7d';
  if (period === 'today' || period === '1d') return presetToRange('today');
  if (period === '7d') return presetToRange('7d');
  if (period === '30d') return presetToRange('30d');
  return presetToRange('7d');
}

export function rangeErrorResponse(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

const MONTH_SHORT_UK = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

function formatShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTH_SHORT_UK[d.getUTCMonth()]}`;
}

export function formatRangeLabel(range: { preset: RangePreset; since: string; until: string }): string {
  if (range.preset === 'today') return 'Сьогодні';
  if (range.preset === '7d') return 'За 7 днів';
  if (range.preset === '30d') return 'За 30 днів';
  if (range.since === range.until) return formatShort(range.since);
  return `${formatShort(range.since)} – ${formatShort(range.until)}`;
}

export function rangeToQueryString(range: DateRange): string {
  if (range.preset === 'custom') return `since=${range.since}&until=${range.until}`;
  return `period=${range.preset}`;
}
