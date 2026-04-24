import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getAdDailyRange, getAdNetworks, getRecent, isConfigured } from '@/lib/redis';
import { parseRangeFromSearchParams, rangeErrorResponse } from '@/lib/admin-range';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'analytics-ads', perMinute: 60 });
  if (denied) return denied;

  const parsed = parseRangeFromSearchParams(req.nextUrl.searchParams);
  if ('error' in parsed) return rangeErrorResponse(parsed.error);
  const { preset, since, until } = parsed;

  const networks = await getAdNetworks();

  const [impressions, clicks, errors, nofill, gateOpens, completed, errorList] = await Promise.all([
    getAdDailyRange('impressions', networks, since, until),
    getAdDailyRange('clicks', networks, since, until),
    getAdDailyRange('errors', networks, since, until),
    getAdDailyRange('nofill', networks, since, until),
    getAdDailyRange('gate_open', networks, since, until),
    getAdDailyRange('download_completed', networks, since, until),
    getRecent('errors:ads', 50),
  ]);

  const sum = (arr: Array<{ total: number }>) => arr.reduce((s, x) => s + x.total, 0);
  const totalImpressions = sum(impressions);
  const totalClicks = sum(clicks);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const byNetwork: Record<string, { impressions: number; clicks: number; errors: number; ctr: number }> = {};
  for (const n of networks) {
    const imp = impressions.reduce((s, x) => s + (x.byNetwork[n] ?? 0), 0);
    const clk = clicks.reduce((s, x) => s + (x.byNetwork[n] ?? 0), 0);
    const err = errors.reduce((s, x) => s + (x.byNetwork[n] ?? 0), 0);
    byNetwork[n] = {
      impressions: imp,
      clicks: clk,
      errors: err,
      ctr: imp > 0 ? (clk / imp) * 100 : 0,
    };
  }

  return NextResponse.json({
    preset,
    since,
    until,
    configured: isConfigured(),
    networks,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      errors: sum(errors),
      nofill: sum(nofill),
      gateOpens: sum(gateOpens),
      downloadsCompleted: sum(completed),
      ctr: Number(ctr.toFixed(2)),
    },
    byDay: impressions.map((x, i) => ({
      date: x.date,
      impressions: x.total,
      clicks: clicks[i]?.total ?? 0,
      errors: errors[i]?.total ?? 0,
    })),
    byNetwork,
    errors: errorList,
  });
}
