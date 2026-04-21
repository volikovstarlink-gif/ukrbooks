import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';

const VALID_STATUS = new Set(['open', 'resolved', 'rejected']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(req, { bucket: 'reports-mutate', perMinute: 30 });
  if (denied) return denied;

  const { id } = await params;
  if (!/^RPT-[A-Z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status || !VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const r = getRedis();
  if (!r) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  }

  await r.set(`report:${id}:status`, body.status, { ex: 60 * 60 * 24 * 180 });

  return NextResponse.json({ ok: true, id, status: body.status });
}
