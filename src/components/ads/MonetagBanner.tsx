'use client';
import { useEffect, useRef, useState } from 'react';
import { hasMonetagZone, loadMonetag } from '@/lib/monetag';
import { trackBannerImpression } from '@/lib/ads-analytics';

interface MonetagBannerProps {
  placement: string;
  minHeight?: number;
  className?: string;
}

export default function MonetagBanner({
  placement,
  minHeight = 100,
  className,
}: MonetagBannerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || loaded) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const ok = loadMonetag();
            if (ok) {
              trackBannerImpression(placement);
              setLoaded(true);
            }
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [placement, loaded]);

  const isDev = process.env.NODE_ENV === 'development';
  const configured = hasMonetagZone();

  if (!configured && !isDev) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={className}
      data-ad-placement={placement}
      style={{
        minHeight,
        margin: '1.5rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {isDev && !configured && visible && (
        <div
          style={{
            width: '100%',
            minHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'repeating-linear-gradient(45deg, rgba(148,163,184,0.12), rgba(148,163,184,0.12) 10px, rgba(148,163,184,0.2) 10px, rgba(148,163,184,0.2) 20px)',
            border: '1px dashed rgba(148,163,184,0.5)',
            color: '#64748b',
            fontSize: 12,
            fontFamily: 'monospace',
            borderRadius: 8,
          }}
        >
          MONETAG @ {placement} (set NEXT_PUBLIC_MONETAG_MULTITAG_ZONE)
        </div>
      )}
    </div>
  );
}
