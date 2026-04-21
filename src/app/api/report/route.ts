import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getRedis, checkRateLimit, pushRecent, recordError } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { abuseTeamEmail, reporterAutoReplyEmail, type ReportPayload } from '@/lib/email-templates';

export const runtime = 'nodejs';

const VALID_TYPES = new Set(['copyright', 'incorrect_metadata', 'broken_file', 'bad_quality', 'other']);
const ABUSE_TO = process.env.ABUSE_EMAIL_TO || 'dmca@ukrbooks.ink';
const MAX_PER_DAY = 10;

function getIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function generateCaseId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = randomBytes(3).toString('hex').toUpperCase();
  return `RPT-${t}-${r}`;
}

async function checkDailyCap(ip: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const key = `rl:report:day:${ip}`;
  const count = await r.incr(key);
  if (count === 1) await r.expire(key, 86400);
  return count <= MAX_PER_DAY;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — silently accept (status 200) but don't process
  if (typeof body.website === 'string' && body.website.length > 0) {
    return NextResponse.json({ caseId: 'RPT-BOT-FILTERED' }, { status: 200 });
  }

  const type = typeof body.type === 'string' ? body.type : '';
  const url = typeof body.url === 'string' ? body.url.slice(0, 500) : '';
  const email = typeof body.email === 'string' ? body.email.slice(0, 200).trim() : '';
  const name = typeof body.name === 'string' ? body.name.slice(0, 100).trim() : '';
  const description = typeof body.description === 'string' ? body.description.slice(0, 3000).trim() : '';
  const bookTitle = typeof body.bookTitle === 'string' ? body.bookTitle.slice(0, 300) : null;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Невідомий тип звернення' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Некоректний email' }, { status: 400 });
  }
  if (description.length < 30) {
    return NextResponse.json({ error: 'Опис має містити мінімум 30 символів' }, { status: 400 });
  }
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Вкажіть коректне посилання' }, { status: 400 });
  }

  const ip = getIp(req);
  const ua = (req.headers.get('user-agent') || '').slice(0, 300);

  // Rate limit: 3/min + 10/day per IP
  const [minuteOk, dayOk] = await Promise.all([
    checkRateLimit(ip, 'report', 3),
    checkDailyCap(ip),
  ]);
  if (!minuteOk || !dayOk) {
    return NextResponse.json(
      { error: 'Забагато запитів. Спробуйте пізніше або напишіть на dmca@ukrbooks.ink' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  const caseId = generateCaseId();
  const payload: ReportPayload = {
    caseId,
    type,
    url,
    email,
    name: name || undefined,
    description,
    bookTitle,
    ip,
    ua,
    ts: Date.now(),
  };

  // Persist (best-effort — if Redis offline, still send email)
  const r = getRedis();
  if (r) {
    try {
      await Promise.all([
        pushRecent('reports:queue', payload as unknown as Record<string, unknown> & { ts: number }, 500),
        r.set(`report:${caseId}`, JSON.stringify(payload), { ex: 60 * 60 * 24 * 180 }),
      ]);
    } catch (err) {
      await recordError('visits', {
        kind: 'report_persist_failed',
        caseId,
        reason: err instanceof Error ? err.message : String(err),
      }).catch(() => {});
    }
  }

  // Email coalescing — protects dmca@ inbox and Resend 100/day free quota
  // when a storm of reports hits (DMCA-troll campaign, script, etc.).
  // - Team mail: skip when >3 reports arrived in the last 10 minutes.
  //   Admin still sees every report in /admin/reports — only the push
  //   notification gets throttled.
  // - Auto-reply: skip when the same reporter email sent >3 reports in
  //   the last hour.
  // Both decisions are best-effort; on Redis failure we fall back to
  // sending normally so we don't silently drop legit notifications.
  let teamMailSkipped = false;
  let autoReplySkipped = false;
  if (r) {
    try {
      const teamKey = `rl:email:team:${new Date().toISOString().slice(0, 16)}`; // per 10-min
      const teamCount = await r.incr(teamKey);
      if (teamCount === 1) await r.expire(teamKey, 600);
      if (teamCount > 3) teamMailSkipped = true;

      const replyKey = `rl:email:reply:${email.toLowerCase()}`;
      const replyCount = await r.incr(replyKey);
      if (replyCount === 1) await r.expire(replyKey, 3600);
      if (replyCount > 3) autoReplySkipped = true;
    } catch {
      // Redis hiccup — don't block email path.
    }
  }

  try {
    if (!teamMailSkipped) {
      const team = abuseTeamEmail(payload);
      await sendEmail({
        to: ABUSE_TO,
        subject: team.subject,
        text: team.text,
        html: team.html,
        replyTo: email,
      });
    }

    if (!autoReplySkipped) {
      const auto = reporterAutoReplyEmail(payload);
      await sendEmail({
        to: email,
        subject: auto.subject,
        text: auto.text,
        html: auto.html,
      });
    }
  } catch (err) {
    await recordError('visits', {
      kind: 'report_email_failed',
      caseId,
      reason: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
  }

  if (teamMailSkipped || autoReplySkipped) {
    await recordError('visits', {
      kind: 'report_email_coalesced',
      caseId,
      teamMailSkipped,
      autoReplySkipped,
    }).catch(() => {});
  }

  return NextResponse.json({ caseId, ok: true });
}
