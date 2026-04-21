import { NextResponse } from 'next/server';
import { getRedis, getRecent } from '@/lib/redis';

export const runtime = 'nodejs';
export const revalidate = 3600;

interface ReportRaw {
  caseId: string;
  type: string;
  ts: number;
}

const TYPES = ['copyright', 'incorrect_metadata', 'broken_file', 'bad_quality', 'other'] as const;

function periodStart(days: number): number {
  return Date.now() - days * 86400 * 1000;
}

export async function GET() {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({ configured: false });
  }

  const queue = (await getRecent('reports:queue', 500)) as unknown as ReportRaw[];
  const caseIds = queue.map((q) => q.caseId).filter(Boolean);

  const statusValues = caseIds.length > 0
    ? await r.mget<(string | null)[]>(...caseIds.map((id) => `report:${id}:status`))
    : [];

  const enriched = queue.map((q, i) => ({
    ...q,
    status: (statusValues?.[i] as 'open' | 'resolved' | 'rejected' | null) || 'open',
  }));

  const buckets = {
    total: enriched.length,
    last30: 0,
    last90: 0,
    byType: Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<string, number>,
    byStatus: { open: 0, resolved: 0, rejected: 0 },
    last30ByType: Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<string, number>,
  };

  const cut30 = periodStart(30);
  const cut90 = periodStart(90);

  for (const rep of enriched) {
    if (rep.ts >= cut30) buckets.last30++;
    if (rep.ts >= cut90) buckets.last90++;
    const t = TYPES.includes(rep.type as (typeof TYPES)[number]) ? rep.type : 'other';
    buckets.byType[t] = (buckets.byType[t] || 0) + 1;
    if (rep.ts >= cut30) buckets.last30ByType[t] = (buckets.last30ByType[t] || 0) + 1;
    buckets.byStatus[rep.status]++;
  }

  const resolutionRate = buckets.byStatus.resolved + buckets.byStatus.rejected > 0
    ? Math.round(
        ((buckets.byStatus.resolved + buckets.byStatus.rejected) / buckets.total) * 100,
      )
    : null;

  return NextResponse.json({
    configured: true,
    generatedAt: new Date().toISOString(),
    retentionNote:
      'Displayed numbers cover up to the last 500 reports stored in our queue. Older entries are aggregated in archives and not shown individually.',
    ...buckets,
    resolutionRate,
  });
}
