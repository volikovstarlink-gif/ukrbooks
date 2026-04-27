import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getRedis } from '@/lib/redis';

/** Patterns of Redis keys that are purely analytics/tracking — safe to nuke
 *  so the admin starts counting from today. We do NOT touch `rl:*`
 *  (rate-limiter, self-expires), session cookies, or any app-level state.
 *
 *  Order is intentional — `ads:networks` (the Set of known network names)
 *  is also matched by `ads:*` and gets deleted alongside the per-network
 *  counters. After the reset, `/admin/ads` will show an empty groups table
 *  until new events arrive and repopulate the Set. */
const RESET_PATTERNS = ['visits:*', 'downloads:*', 'ads:*', 'errors:*'];

async function scanAndDelete(
  r: ReturnType<typeof getRedis>,
  pattern: string,
): Promise<number> {
  if (!r) return 0;
  let cursor: string | number = 0;
  let deleted = 0;
  // Defensive cap — in case SCAN loops forever on a corrupt cursor, stop
  // after this many iterations. At count=500 per scan step, 200 iterations
  // covers 100k keys, way more than this catalog will ever hit.
  const MAX_ITERATIONS = 200;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const scanResult = (await r.scan(cursor, { match: pattern, count: 500 })) as [
      string | number,
      string[],
    ];
    const next: string | number = scanResult[0];
    const keys: string[] = scanResult[1];
    if (Array.isArray(keys) && keys.length > 0) {
      // @upstash/redis DEL accepts variadic args; spread defensively in
      // chunks of 500 so URL length doesn't blow up on huge batches.
      for (let j = 0; j < keys.length; j += 500) {
        const chunk = keys.slice(j, j + 500);
        const n = await r.del(...chunk);
        deleted += typeof n === 'number' ? n : 0;
      }
    }
    cursor = next;
    if (String(cursor) === '0') break;
  }
  return deleted;
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'reset', perMinute: 5 });
  if (denied) return denied;

  const r = getRedis();
  if (!r) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 503 },
    );
  }

  const results: Record<string, number> = {};
  let total = 0;
  for (const pattern of RESET_PATTERNS) {
    const n = await scanAndDelete(r, pattern);
    results[pattern] = n;
    total += n;
  }

  return NextResponse.json({
    ok: true,
    total,
    deletedByPattern: results,
    resetAt: new Date().toISOString(),
  });
}
