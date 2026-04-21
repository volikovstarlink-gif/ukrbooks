import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getAdDaily, getAdNetworks, getRecent, isConfigured } from '@/lib/redis';

const PERIOD_DAYS: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 };

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'analytics-ads', perMinute: 60 });
  if (denied) return denied;

  const period = req.nextUrl.searchParams.get('period') || '7d';
  const days = PERIOD_DAYS[period] ?? 7;

  const networks = await getAdNetworks();

  const [impressions, clicks, errors, nofill, gateOpens, completed, errorList] = await Promise.all([
    getAdDaily('impressions', networks, days),
    getAdDaily('clicks', networks, days),
    getAdDaily('errors', networks, days),
    getAdDaily('nofill', networks, days),
    getAdDaily('gate_open', networks, days),
    getAdDaily('download_completed', networks, days),
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
    period,
    days,
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
