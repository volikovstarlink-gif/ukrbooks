import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getDaily, getRecent, getUniqueDaily, isConfigured } from '@/lib/redis';

const PERIOD_DAYS: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 };

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'analytics-visits', perMinute: 60 });
  if (denied) return denied;

  const period = req.nextUrl.searchParams.get('period') || '7d';
  const days = PERIOD_DAYS[period] ?? 7;

  const [visits, unique, errors] = await Promise.all([
    getDaily('visits', days),
    getUniqueDaily(days),
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
    period,
    days,
    configured: isConfigured(),
    totals: { visits: totalVisits, unique: totalUnique },
    byDay,
    errors,
  });
}
