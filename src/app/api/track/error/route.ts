import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordError, type ErrorCategory } from '@/lib/redis';

const VALID_CATEGORIES: ErrorCategory[] = ['downloads', 'ads', 'storage', 'visits'];

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: { category?: unknown; message?: unknown; ctx?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const category = body.category as ErrorCategory;
  const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';

  if (!VALID_CATEGORIES.includes(category) || !message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip = getIp(req);
  if (!(await checkRateLimit(ip, 'error', 30))) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const ctx = body.ctx && typeof body.ctx === 'object' ? (body.ctx as Record<string, unknown>) : {};
  await recordError(category, { message, ...ctx });
  return NextResponse.json({ ok: true });
}
