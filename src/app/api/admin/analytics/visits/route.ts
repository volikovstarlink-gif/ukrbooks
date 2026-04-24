import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getDailyRange, getRecent, getUniqueDailyRange, isConfigured } from '@/lib/redis';
import { parseRangeFromSearchParams, rangeErrorResponse } from '@/lib/admin-range';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'analytics-visits', perMinute: 60 });
  if (denied) return denied;

  const parsed = parseRangeFromSearchParams(req.nextUrl.searchParams);
  if ('error' in parsed) return rangeErrorResponse(parsed.error);
  const { preset, since, until } = parsed;

  const [visits, unique, errors] = await Promise.all([
    getDailyRange('visits', since, until),
    getUniqueDailyRange(since, until),
    getRecent('errors:visits', 50),
  ]);

  const totalVisits = visits.reduce((s, x) => s + x.value, 0);
  const totalUnique = unique.reduce((s, x) => s + x.value, 0);

  const byDay = visits.map((v, i) => ({
    date: v.date,
    visits: v.value,
    unique: unique[i]?.value ?? 0,
  }));

  return NextResponse.json({
    preset,
    since,
    until,
    configured: isConfigured(),
    totals: { visits: totalVisits, unique: totalUnique },
    byDay,
    errors,
  });
}
