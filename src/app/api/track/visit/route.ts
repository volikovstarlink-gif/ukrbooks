import { NextRequest, NextResponse } from 'next/server';
import { addUniqueVisitor, checkRateLimit, incrDaily } from '@/lib/redis';

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: { visitorId?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : '';
  if (!visitorId) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = getIp(req);
  if (!(await checkRateLimit(ip, 'visit', 120))) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  await Promise.all([incrDaily('visits'), addUniqueVisitor(visitorId)]);
  return NextResponse.json({ ok: true });
}
