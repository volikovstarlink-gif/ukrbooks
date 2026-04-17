import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateCredentials, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Невірний запит' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Введіть логін та пароль' }, { status: 400 });
  }

  if (!validateCredentials(username, password)) {
    return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
  }

  const session = await createSession(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return res;
}
