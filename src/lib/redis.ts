import { Redis } from '@upstash/redis';

let cached: Redis | null = null;

export function getRedis(): Redis | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cached = new Redis({ url, token });
  return cached;
}

export function isConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

const RETENTION_SECONDS = 60 * 60 * 24 * 90;
const UNIQUE_VISITOR_TTL = RETENTION_SECONDS;

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDate(d));
  }
  return out;
}

export function datesInRange(since: string, until: string): string[] {
  const start = new Date(`${since}T00:00:00Z`);
  const end = new Date(`${until}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return [];
  if (end < start) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(isoDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export async function incrDaily(metric: string, by = 1): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `${metric}:${isoDate()}`;
  await r.incrby(key, by);
  await r.expire(key, RETENTION_SECONDS);
}

export async function addUniqueVisitor(visitorId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `visits:unique:${isoDate()}`;
  await r.sadd(key, visitorId);
  await r.expire(key, UNIQUE_VISITOR_TTL);
}

export async function incrBookDownload(slug: string, title: string, format: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const member = `${slug}|${title}`;
  await Promise.all([
    r.zincrby('downloads:books', 1, member),
    r.incr(`downloads:book:${slug}:total`),
    pushRecent('downloads:recent', { slug, title, format, ts: Date.now() }, 200),
  ]);
}

export async function incrAdCounter(
  kind: 'impressions' | 'clicks' | 'errors' | 'nofill' | 'quartile' | 'gate_open' | 'download_completed',
  network: string,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `ads:${kind}:${network}:${isoDate()}`;
  await Promise.all([r.incr(key), r.sadd('ads:networks', network)]);
  await r.expire(key, RETENTION_SECONDS);
}

export async function getAdNetworks(): Promise<string[]> {
  const r = getRedis();
  if (!r) return [];
  const members = await r.smembers('ads:networks');
  return (members ?? []).map(String).sort();
}

export interface RecentEvent {
  ts: number;
  [k: string]: unknown;
}

export async function pushRecent(listKey: string, event: RecentEvent, cap = 200): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.lpush(listKey, JSON.stringify(event));
  await r.ltrim(listKey, 0, cap - 1);
}

export type ErrorCategory = 'downloads' | 'ads' | 'storage' | 'visits';

export async function recordError(category: ErrorCategory, ctx: Record<string, unknown>): Promise<void> {
  await pushRecent(`errors:${category}`, { ts: Date.now(), ...ctx }, 200);
}

async function getDailyForDates(metric: string, dates: string[]): Promise<Array<{ date: string; value: number }>> {
  const r = getRedis();
  if (!r || dates.length === 0) return dates.map(date => ({ date, value: 0 }));
  const keys = dates.map(d => `${metric}:${d}`);
  const raw = await r.mget<(string | number | null)[]>(...keys);
  return dates.map((date, i) => {
    const v = raw?.[i];
    const num = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    return { date, value: Number.isFinite(num) ? num : 0 };
  });
}

async function getUniqueForDates(dates: string[]): Promise<Array<{ date: string; value: number }>> {
  const r = getRedis();
  if (!r || dates.length === 0) return dates.map(date => ({ date, value: 0 }));
  const counts = await Promise.all(dates.map(d => r.scard(`visits:unique:${d}`)));
  return dates.map((date, i) => ({ date, value: Number(counts[i] ?? 0) }));
}

async function getAdForDates(
  kind: 'impressions' | 'clicks' | 'errors' | 'nofill' | 'quartile' | 'gate_open' | 'download_completed',
  networks: string[],
  dates: string[],
): Promise<Array<{ date: string; byNetwork: Record<string, number>; total: number }>> {
  const r = getRedis();
  if (!r || dates.length === 0) return dates.map(date => ({ date, byNetwork: {}, total: 0 }));
  const keys: string[] = [];
  for (const d of dates) for (const n of networks) keys.push(`ads:${kind}:${n}:${d}`);
  const raw = keys.length ? await r.mget<(string | number | null)[]>(...keys) : [];
  return dates.map((date, di) => {
    const byNetwork: Record<string, number> = {};
    let total = 0;
    networks.forEach((n, ni) => {
      const v = raw?.[di * networks.length + ni];
      const num = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
      const safe = Number.isFinite(num) ? num : 0;
      byNetwork[n] = safe;
      total += safe;
    });
    return { date, byNetwork, total };
  });
}

export function getDaily(metric: string, days: number) {
  return getDailyForDates(metric, lastNDates(days));
}

export function getDailyRange(metric: string, since: string, until: string) {
  return getDailyForDates(metric, datesInRange(since, until));
}

export function getUniqueDaily(days: number) {
  return getUniqueForDates(lastNDates(days));
}

export function getUniqueDailyRange(since: string, until: string) {
  return getUniqueForDates(datesInRange(since, until));
}

export function getAdDaily(
  kind: 'impressions' | 'clicks' | 'errors' | 'nofill' | 'quartile' | 'gate_open' | 'download_completed',
  networks: string[],
  days: number,
) {
  return getAdForDates(kind, networks, lastNDates(days));
}

export function getAdDailyRange(
  kind: 'impressions' | 'clicks' | 'errors' | 'nofill' | 'quartile' | 'gate_open' | 'download_completed',
  networks: string[],
  since: string,
  until: string,
) {
  return getAdForDates(kind, networks, datesInRange(since, until));
}

export async function getTopBooks(limit = 20): Promise<Array<{ slug: string; title: string; count: number }>> {
  const r = getRedis();
  if (!r) return [];
  const raw = await r.zrange<(string | number)[]>('downloads:books', 0, limit - 1, {
    rev: true,
    withScores: true,
  });
  const out: Array<{ slug: string; title: string; count: number }> = [];
  for (let i = 0; i < raw.length; i += 2) {
    const member = String(raw[i] ?? '');
    const score = Number(raw[i + 1] ?? 0);
    const pipeIdx = member.indexOf('|');
    const slug = pipeIdx === -1 ? member : member.slice(0, pipeIdx);
    const title = pipeIdx === -1 ? '' : member.slice(pipeIdx + 1);
    out.push({ slug, title, count: score });
  }
  return out;
}

export async function getRecent(listKey: string, limit = 50): Promise<RecentEvent[]> {
  const r = getRedis();
  if (!r) return [];
  const raw = await r.lrange(listKey, 0, limit - 1);
  return raw.map(item => {
    if (typeof item === 'string') {
      try {
        return JSON.parse(item) as RecentEvent;
      } catch {
        return { ts: 0, raw: item };
      }
    }
    if (item && typeof item === 'object') return item as RecentEvent;
    return { ts: 0, raw: String(item) };
  });
}

export async function checkRateLimit(ip: string, bucket: string, maxPerMinute: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const key = `rl:${bucket}:${ip}`;
  const now = Date.now();
  await r.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await r.zremrangebyscore(key, 0, now - 60_000);
  const count = await r.zcard(key);
  await r.expire(key, 120);
  return (count ?? 0) <= maxPerMinute;
}
