'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import AdsterraBanner from './AdsterraBanner';

export default function StickyMobileBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-2"
      style={{
        minHeight: 54,
        background: 'rgba(15,23,42,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(6px)',
      }}
      data-ad-placement="sticky-mobile"
    >
      <div className="flex-1 flex items-center justify-center">
        <AdsterraBanner size="320x50" placement="sticky-mobile" />
      </div>
      <button
        onClick={() => setClosed(true)}
        className="text-white/50 hover:text-white p-2 ml-1"
        aria-label="Закрити рекламу"
      >
        <X size={14} />
      </button>
    </div>
  );
}
