'use client';
import { useEffect, useRef, useState } from 'react';
import {
  buildHilltopBannerHtml,
  getHilltopBannerConfig,
  type HilltopBannerSize,
} from '@/lib/hilltopads';
import { trackBannerImpression } from '@/lib/ads-analytics';

interface HilltopBannerProps {
  size: HilltopBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

export default function HilltopBanner({ size, placement, className, compact }: HilltopBannerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const { src, width, height } = getHilltopBannerConfig(size);

  useEffect(() => {
    if (visible) return;
    const el = hostRef.current;
    if (!el) return;
    const reveal = () => {
      setVisible(true);
      trackBannerImpression(`hilltopads-${size}-${placement}`);
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

  if (!src) return null;

  const srcDoc = buildHilltopBannerHtml(src, width, height);

  return (
    <div
      ref={hostRef}
      className={className}
      data-ad-placement={`hilltopads-${placement}`}
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
      {visible && (
        <iframe
          title={`ad-hilltop-${placement}`}
          srcDoc={srcDoc}
          width={width}
          height={height}
          style={{ border: 'none', maxWidth: '100%' }}
          sandbox="allow-scripts allow-popups"
          referrerPolicy="no-referrer"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
