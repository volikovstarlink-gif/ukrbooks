import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/admin-auth';
import { getRedis, getRecent } from '@/lib/redis';

export const runtime = 'nodejs';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  return !!(await verifySession(session));
}

interface ReportListItem {
  caseId: string;
  type: string;
  url: string;
  email: string;
  name?: string;
  description: string;
  bookTitle?: string | null;
  ip?: string;
  ua?: string;
  ts: number;
  status?: 'open' | 'resolved' | 'rejected';
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const r = getRedis();
  if (!r) {
    return NextResponse.json({ reports: [], configured: false });
  }

  const queue = (await getRecent('reports:queue', 200)) as unknown as ReportListItem[];

  // Enrich with per-case status
  const statusRaw = queue.length > 0
    ? await r.mget<(string | null)[]>(...queue.map((q) => `report:${q.caseId}:status`))
    : [];

  const reports = queue.map((item, i) => {
    const statusStr = statusRaw?.[i];
    const status = (statusStr as 'open' | 'resolved' | 'rejected') || 'open';
    return { ...item, status };
  });

  return NextResponse.json({ reports, configured: true, total: reports.length });
}
