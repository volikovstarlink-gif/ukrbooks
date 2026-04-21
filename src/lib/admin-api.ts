import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './admin-auth';
import { checkRateLimit } from './redis';

/**
 * Guard for /api/admin/* route handlers.
 * - Returns 401 if the admin session cookie is missing or invalid.
 * - Returns 429 if `bucket` is set and the caller exceeds `perMinute`.
 * - Returns `null` when the request may proceed.
 *
 * Bucket keys are scoped per IP — a stolen session still gets rate-limited.
 */
export async function requireAdmin(
  req: NextRequest,
  opts?: { bucket?: string; perMinute?: number },
): Promise<NextResponse | null> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!opts?.bucket) return null;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'admin';

  const ok = await checkRateLimit(ip, `admin:${opts.bucket}`, opts.perMinute ?? 60);
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }
  return null;
}
