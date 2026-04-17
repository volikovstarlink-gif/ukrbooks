'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'ukr-visitor-id';
const SESSION_FLAG = 'ukr-visit-sent';

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

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return;
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return;
      sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      // ignore sessionStorage errors
    }
    sendVisit(getVisitorId(), pathname);
  }, [pathname]);

  return null;
}
