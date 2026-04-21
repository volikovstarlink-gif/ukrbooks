/**
 * Resend REST API wrapper — no SDK dependency.
 * Returns null if RESEND_API_KEY is absent (graceful degradation).
 */

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<{ id: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from = process.env.RESEND_FROM || 'UkrBooks <noreply@ukrbooks.ink>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      text: args.text,
      ...(args.html ? { html: args.html } : {}),
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  return { id: data.id || '' };
}
