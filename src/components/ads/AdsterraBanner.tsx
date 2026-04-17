'use client';
import { useEffect, useRef, useState } from 'react';
import {
  buildAdsterraBannerHtml,
  getAdsterraBannerConfig,
  type AdsterraBannerSize,
} from '@/lib/adsterra';
import { trackBannerImpression } from '@/lib/ads-analytics';

interface AdsterraBannerProps {
  size: AdsterraBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

export default function AdsterraBanner({ size, placement, className, compact }: AdsterraBannerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const { key, width, height } = getAdsterraBannerConfig(size);

  useEffect(() => {
    if (visible) return;
    const el = hostRef.current;
    if (!el) return;
    const reveal = () => {
      setVisible(true);
      trackBannerImpression(`adsterra-${size}-${placement}`);
    };
    if (typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    // Safety fallback: if IO never fires within 2 s (stuck above-the-fold
    // near the top of an SSR'd page, rare layout quirks), reveal anyway.
    const fallbackTimer = window.setTimeout(() => {
      if (!visible) {
        reveal();
        observer.disconnect();
      }
    }, 2000);
    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [visible, placement, size]);

  const isDev = process.env.NODE_ENV === 'development';
  if (!key && !isDev) return null;

  const srcDoc = key ? buildAdsterraBannerHtml(key, width, height) : '';

  return (
    <div
      ref={hostRef}
      className={className}
      data-ad-placement={`adsterra-${placement}`}
      data-ad-size={size}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: compact ? 0 : '1.25rem auto',
        minHeight: height,
      }}
    >
      {visible && key && (
        <iframe
          title={`ad-${placement}`}
          srcDoc={srcDoc}
          width={width}
          height={height}
          style={{ border: 'none', maxWidth: '100%' }}
          sandbox="allow-scripts allow-popups"
          referrerPolicy="no-referrer"
          aria-hidden="true"
        />
      )}
      {visible && !key && isDev && (
        <div
          style={{
            width,
            height,
            maxWidth: '100%',
            border: '1px dashed rgba(239,68,68,0.5)',
            background:
              'repeating-linear-gradient(45deg, rgba(239,68,68,0.08), rgba(239,68,68,0.08) 10px, rgba(239,68,68,0.18) 10px, rgba(239,68,68,0.18) 20px)',
            color: '#64748b',
            fontSize: 12,
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            textAlign: 'center',
            padding: '0 8px',
          }}
        >
          ADSTERRA {size} @ {placement}
        </div>
      )}
    </div>
  );
}
