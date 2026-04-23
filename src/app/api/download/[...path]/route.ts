import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { checkRateLimit, getRedis, incrDaily, recordError } from '@/lib/redis';

const BOOKS_DIR = process.env.BOOKS_DIR || path.join(process.cwd(), '..', 'Books');

const MIME: Record<string, string> = {
  epub: 'application/epub+zip',
  fb2: 'application/x-fictionbook+xml',
  pdf: 'application/pdf',
};

const RATE_PER_MINUTE = 30;
const DAILY_CAP = 300;
const BASE_HOST = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

function getIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

async function checkDailyCap(ip: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const day = new Date().toISOString().split('T')[0];
  const key = `rl:download:day:${day}:${ip}`;
  const count = await r.incr(key);
  if (count === 1) await r.expire(key, 86400);
  return count <= DAILY_CAP;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments || segments.length < 2) {
    return new NextResponse('Bad request', { status: 400 });
  }

  // segments = [dir, filename]
  const [dir, ...rest] = segments;
  const filename = rest.join('/');

  // Security: prevent path traversal
  if (dir.includes('..') || filename.includes('..')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Rate limiting — both per-minute and daily per-IP
  const ip = getIp(request);
  const [minuteOk, dayOk] = await Promise.all([
    checkRateLimit(ip, 'download', RATE_PER_MINUTE),
    checkDailyCap(ip),
  ]);
  if (!minuteOk || !dayOk) {
    recordError('downloads', { dir, filename, reason: 'rate_limited', ip }).catch(() => {});
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': minuteOk ? '86400' : '60' },
    });
  }

  // Soft referer check — log but don't block (direct links must work)
  const referer = request.headers.get('referer') || '';
  const ua = request.headers.get('user-agent') || '';
  if (!ua || ua.length < 5) {
    recordError('downloads', { dir, filename, reason: 'empty_ua', ip }).catch(() => {});
    return new NextResponse('Forbidden', { status: 403 });
  }
  const offSite = referer && !referer.startsWith(BASE_HOST) && !referer.includes('ukrbooks.');
  if (offSite) {
    recordError('downloads', { dir, filename, reason: 'offsite_referer', referer: referer.slice(0, 200), ip }).catch(() => {});
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME[ext] || 'application/octet-stream';
  // Production downloads go direct to R2 via NEXT_PUBLIC_BOOKS_BASE_URL and
  // never hit this route. The filesystem read below is dev-only. We mark the
  // path.join with turbopackIgnore so Turbopack doesn't trace the entire
  // Books/ directory (28k+ files) into the serverless bundle — doing so
  // exceeds Vercel's 250MB function size limit.
  const filePath = path.join(/*turbopackIgnore: true*/ BOOKS_DIR, dir, filename);

  try {
    const data = await readFile(filePath);
    incrDaily('downloads').catch(() => {});
    return new NextResponse(data, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    recordError('downloads', { dir, filename, reason }).catch(() => {});
    return new NextResponse('File not found', { status: 404 });
  }
}
