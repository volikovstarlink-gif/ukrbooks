import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrBookDownload, incrDaily } from '@/lib/redis';

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: { bookSlug?: unknown; bookTitle?: unknown; format?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = typeof body.bookSlug === 'string' ? body.bookSlug.slice(0, 200) : '';
  const title = typeof body.bookTitle === 'string' ? body.bookTitle.slice(0, 300) : '';
  const format = typeof body.format === 'string' ? body.format.slice(0, 12) : '';

  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = getIp(req);
  if (!(await checkRateLimit(ip, 'download', 60))) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  await Promise.all([incrDaily('downloads'), incrBookDownload(slug, title, format)]);
  return NextResponse.json({ ok: true });
}
