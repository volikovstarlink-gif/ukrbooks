import { NextRequest, NextResponse } from 'next/server';
import { getDaily, getRecent, getTopBooks, isConfigured } from '@/lib/redis';

const PERIOD_DAYS: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 };

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || '7d';
  const days = PERIOD_DAYS[period] ?? 7;

  const [byDay, topBooks, recent, errors] = await Promise.all([
    getDaily('downloads', days),
    getTopBooks(20),
    getRecent('downloads:recent', 50),
    getRecent('errors:downloads', 50),
  ]);

  const total = byDay.reduce((s, x) => s + x.value, 0);

  return NextResponse.json({
    period,
    days,
    configured: isConfigured(),
    total,
    byDay,
    topBooks,
    recent,
    errors,
  });
}
