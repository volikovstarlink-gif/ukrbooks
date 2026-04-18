'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AdsterraBanner from './AdsterraBanner';

const DISMISS_KEY = 'ukrbooks-sticky-dismissed-at';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export default function StickyMobileBanner() {
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const at = raw ? Number(raw) : 0;
      if (at && Date.now() - at < DISMISS_TTL_MS) return;
      setClosed(false);
    } catch {
      setClosed(false);
    }
  }, []);

  const handleClose = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // quota / private mode — banner hides for the session at least
    }
  };

  if (closed) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-2"
      style={{
        minHeight: 56,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(15,23,42,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(6px)',
      }}
      data-ad-placement="sticky-mobile"
    >
      <div className="flex-1 flex items-center justify-center">
        <AdsterraBanner size="320x50" placement="sticky-mobile" compact />
      </div>
      <button
        onClick={handleClose}
        className="text-white/50 hover:text-white p-1.5 ml-1"
        aria-label="Закрити рекламу"
      >
        <X size={14} />
      </button>
    </div>
  );
}
