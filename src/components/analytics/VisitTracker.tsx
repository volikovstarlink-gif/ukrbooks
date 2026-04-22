'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'ukr-visitor-id';
const LAST_PATH_KEY = 'ukr-visit-last-path';
const LAST_PATH_TS_KEY = 'ukr-visit-last-ts';
const SAME_PATH_DEDUPE_MS = 5_000;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2, 10);
  }
}

function sendVisit(visitorId: string, path: string): void {
  const payload = JSON.stringify({ visitorId, path });
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/track/visit', blob)) return;
    }
    fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow
  }
}

export default function VisitTracker() {
  const pathname = usePathname();
  const lastSentRef = useRef<{ path: string; ts: number } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const now = Date.now();
    const inMem = lastSentRef.current;
    if (inMem && inMem.path === pathname && now - inMem.ts < SAME_PATH_DEDUPE_MS) return;

    try {
      const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
      const lastTs = Number(sessionStorage.getItem(LAST_PATH_TS_KEY) || '0');
      if (lastPath === pathname && now - lastTs < SAME_PATH_DEDUPE_MS) return;
      sessionStorage.setItem(LAST_PATH_KEY, pathname);
      sessionStorage.setItem(LAST_PATH_TS_KEY, String(now));
    } catch {
      // ignore sessionStorage errors
    }

    lastSentRef.current = { path: pathname, ts: now };
    sendVisit(getVisitorId(), pathname);
  }, [pathname]);

  return null;
}
