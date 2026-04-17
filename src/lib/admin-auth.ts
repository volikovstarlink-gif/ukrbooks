const SESSION_VERSION = 'v1';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(sigBuf);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(username: string): Promise<string> {
  const issuedAt = Date.now();
  const payload = `${username}:${issuedAt}`;
  const sig = await hmac(payload, getSecret());
  return `${SESSION_VERSION}.${username}.${issuedAt}.${sig}`;
}

export async function verifySession(value: string | undefined | null): Promise<{ username: string } | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [version, username, issuedAtStr, sig] = parts;
  if (version !== SESSION_VERSION) return null;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_TTL_MS) return null;
  let expectedSig: string;
  try {
    expectedSig = await hmac(`${username}:${issuedAt}`, getSecret());
  } catch {
    return null;
  }
  if (!timingSafeEqual(sig, expectedSig)) return null;
  return { username };
}

export async function isAuthenticated(cookieValue: string | undefined | null): Promise<boolean> {
  const s = await verifySession(cookieValue);
  return !!s;
}

export function validateCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return timingSafeEqual(username, expectedUser) && timingSafeEqual(password, expectedPass);
}
