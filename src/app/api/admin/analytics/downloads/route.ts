import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getDailyRange, getRecent, getTopBooks, isConfigured } from '@/lib/redis';
import { parseRangeFromSearchParams, rangeErrorResponse } from '@/lib/admin-range';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'analytics-downloads', perMinute: 60 });
  if (denied) return denied;

  const parsed = parseRangeFromSearchParams(req.nextUrl.searchParams);
  if ('error' in parsed) return rangeErrorResponse(parsed.error);
  const { preset, since, until } = parsed;

  const [byDay, topBooks, recent, errors] = await Promise.all([
    getDailyRange('downloads', since, until),
    getTopBooks(20),
    getRecent('downloads:recent', 50),
    getRecent('errors:downloads', 50),
  ]);

  const total = byDay.reduce((s, x) => s + x.value, 0);

  return NextResponse.json({
    preset,
    since,
    until,
    configured: isConfigured(),
    total,
    byDay,
    topBooks,
    recent,
    errors,
  });
}
