import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrAdCounter, recordError } from '@/lib/redis';

type AdEventType = 'impressions' | 'clicks' | 'errors' | 'nofill' | 'quartile' | 'gate_open' | 'download_completed';
const VALID_TYPES: AdEventType[] = ['impressions', 'clicks', 'errors', 'nofill', 'quartile', 'gate_open', 'download_completed'];
const NETWORK_SAFE = /^[a-z0-9_-]{1,24}$/i;

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: { type?: unknown; network?: unknown; errorCode?: unknown; ctx?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = body.type as AdEventType;
  const network = typeof body.network === 'string' ? body.network : '';

  if (!VALID_TYPES.includes(type) || !NETWORK_SAFE.test(network)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip = getIp(req);
  if (!(await checkRateLimit(ip, 'ad-event', 240))) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  await incrAdCounter(type, network);

  if (type === 'errors') {
    const errorCode = typeof body.errorCode === 'string' ? body.errorCode.slice(0, 80) : 'unknown';
    const ctx = body.ctx && typeof body.ctx === 'object' ? (body.ctx as Record<string, unknown>) : {};
    await recordError('ads', { network, errorCode, ...ctx });
  }

  return NextResponse.json({ ok: true });
}
