/**
 * Email templates for report/complaint workflow.
 * Sent via Resend REST API (see lib/email.ts) — no SDK dep.
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export interface ReportPayload {
  caseId: string;
  type: string;
  url: string;
  email: string;
  name?: string;
  description: string;
  bookTitle?: string | null;
  ip?: string;
  ua?: string;
  ts: number;
}

const TYPE_LABEL_UA: Record<string, string> = {
  copyright: 'Порушення авторських прав',
  incorrect_metadata: 'Неточні метадані',
  broken_file: 'Файл пошкоджено',
  bad_quality: 'Погана якість',
  other: 'Інше',
};

const TYPE_LABEL_EN: Record<string, string> = {
  copyright: 'Copyright infringement',
  incorrect_metadata: 'Incorrect metadata',
  broken_file: 'Broken file',
  bad_quality: 'Poor quality',
  other: 'Other',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function abuseTeamEmail(p: ReportPayload) {
  const typeUa = TYPE_LABEL_UA[p.type] ?? p.type;
  const typeEn = TYPE_LABEL_EN[p.type] ?? p.type;
  const subject = `[${p.caseId}] ${typeUa} — ${p.bookTitle || 'UkrBooks'}`;

  const text = `New report / Нова скарга
=====================================
Case ID: ${p.caseId}
Type / Тип: ${typeUa} (${typeEn})
URL: ${p.url}
Book / Книга: ${p.bookTitle || '—'}

From / Від:
  Name: ${p.name || '—'}
  Email: ${p.email}
  IP: ${p.ip || '—'}
  UA: ${p.ua || '—'}
  Timestamp: ${new Date(p.ts).toISOString()}

Description / Опис:
${p.description}

=====================================
Admin queue: ${BASE}/admin/reports
`;

  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1a1a2e;margin:0 0 10px 0">Нова скарга — ${p.caseId}</h2>
  <p style="color:#666;font-size:14px;margin:0 0 20px 0">New report for UkrBooks</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:120px">Case ID</td><td style="padding:6px 0;font-family:monospace;font-weight:600">${escapeHtml(p.caseId)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Тип</td><td style="padding:6px 0"><strong>${escapeHtml(typeUa)}</strong> (${escapeHtml(typeEn)})</td></tr>
    <tr><td style="padding:6px 0;color:#666">Книга</td><td style="padding:6px 0">${escapeHtml(p.bookTitle || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:#666">URL</td><td style="padding:6px 0"><a href="${escapeHtml(p.url)}" style="color:#1e40af">${escapeHtml(p.url)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666">Від</td><td style="padding:6px 0">${escapeHtml(p.name || '—')} &lt;<a href="mailto:${escapeHtml(p.email)}" style="color:#1e40af">${escapeHtml(p.email)}</a>&gt;</td></tr>
    <tr><td style="padding:6px 0;color:#666">IP / UA</td><td style="padding:6px 0;font-family:monospace;font-size:12px;color:#888">${escapeHtml(p.ip || '—')} · ${escapeHtml((p.ua || '—').slice(0, 120))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Час</td><td style="padding:6px 0">${new Date(p.ts).toISOString()}</td></tr>
  </table>

  <h3 style="color:#1a1a2e;margin:24px 0 8px 0;font-size:14px">Опис / Description</h3>
  <div style="background:#f8f5f0;border:1px solid #e5e5e5;border-radius:8px;padding:12px;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(p.description)}</div>

  <p style="margin-top:24px;font-size:13px;color:#666">
    <a href="${BASE}/admin/reports" style="color:#1e40af">Відкрити в адмін-панелі →</a>
  </p>
</div>`;

  return { subject, text, html };
}

export function reporterAutoReplyEmail(p: ReportPayload) {
  const typeUa = TYPE_LABEL_UA[p.type] ?? p.type;
  const subject = `[UkrBooks] Заявку ${p.caseId} прийнято`;

  const text = `Добрий день${p.name ? `, ${p.name}` : ''}!

Ми отримали вашу заявку щодо UkrBooks.

Номер звернення: ${p.caseId}
Тип: ${typeUa}
Сторінка: ${p.url}
Час подачі: ${new Date(p.ts).toISOString()}

Ми розглянемо вашу скаргу протягом 48–72 годин і надішлемо результат на цей email. Для термінових випадків (судові запити, претензії видавництв) пріоритетно — до 24 годин.

Якщо ви не подавали цю заявку — проігноруйте цей лист.

---
З повагою,
команда UkrBooks
${BASE}/dmca


--- English ---

Hello${p.name ? `, ${p.name}` : ''},

We have received your report regarding UkrBooks.
Case ID: ${p.caseId}
We will respond within 48–72 hours.

If you did not submit this report, please ignore this email.

Regards,
UkrBooks team
`;

  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1a1a2e;margin:0 0 8px 0">Заявку прийнято</h2>
  <p style="color:#666;margin:0 0 20px 0">Thanks for your report — we're on it.</p>

  <p style="font-size:15px;line-height:1.6">Добрий день${p.name ? `, ${escapeHtml(p.name)}` : ''}!</p>
  <p style="font-size:15px;line-height:1.6">Ми отримали вашу заявку щодо UkrBooks. Номер звернення:</p>

  <div style="background:#f8f5f0;border:1px solid #e5e5e5;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
    <code style="font-size:18px;font-weight:600;font-family:monospace">${escapeHtml(p.caseId)}</code>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    <tr><td style="padding:4px 0;color:#666;width:110px">Тип</td><td style="padding:4px 0">${escapeHtml(typeUa)}</td></tr>
    <tr><td style="padding:4px 0;color:#666">Сторінка</td><td style="padding:4px 0;word-break:break-all"><a href="${escapeHtml(p.url)}" style="color:#1e40af">${escapeHtml(p.url)}</a></td></tr>
    <tr><td style="padding:4px 0;color:#666">Час</td><td style="padding:4px 0">${new Date(p.ts).toISOString()}</td></tr>
  </table>

  <p style="font-size:15px;line-height:1.6">Ми розглянемо вашу скаргу протягом <strong>48–72 годин</strong> і надішлемо відповідь на цей email. Для термінових випадків (судові запити, претензії видавництв) — пріоритетно до 24 годин.</p>

  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">

  <p style="font-size:14px;color:#666;line-height:1.5">
    <strong>English:</strong> We have received your report. Case ID: <code>${escapeHtml(p.caseId)}</code>. We will respond within 48–72 hours. If you did not submit this report, please ignore this email.
  </p>

  <p style="margin-top:24px;font-size:13px;color:#888">
    Команда UkrBooks · <a href="${BASE}" style="color:#1e40af">${BASE}</a>
  </p>
</div>`;

  return { subject, text, html };
}
