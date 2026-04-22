'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { getMgidWidgetConfig } from '@/lib/mgid';
import { trackBannerImpression } from '@/lib/ads-analytics';

interface MgidWidgetProps {
  placement: string;
  className?: string;
  minHeight?: number;
}

export default function MgidWidget({ placement, className, minHeight = 250 }: MgidWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const { siteId, widgetId } = getMgidWidgetConfig(placement);

  useEffect(() => {
    if (visible) return;
    const el = hostRef.current;
    if (!el) return;
    const reveal = () => {
      setVisible(true);
      trackBannerImpression(`mgid-${placement}`);
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
    return () => observer.disconnect();
  }, [visible, placement]);

  const isDev = process.env.NODE_ENV === 'development';
  const configured = Boolean(siteId && widgetId);
  if (!configured && !isDev) return null;

  return (
    <div
      ref={hostRef}
      className={className}
      data-ad-placement={`mgid-${placement}`}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        margin: '1.25rem auto',
        minHeight,
      }}
    >
      {visible && configured && (
        <>
          <div data-type="_mgwidget" data-widget-id={widgetId} />
          <Script
            id={`mgid-loader-${widgetId}`}
            src={`https://jsc.mgid.com/site/${siteId}.js?t=${widgetId}`}
            strategy="lazyOnload"
          />
        </>
      )}
      {visible && !configured && isDev && (
        <div
          style={{
            width: 300,
            height: minHeight,
            maxWidth: '100%',
            border: '1px dashed rgba(59,130,246,0.5)',
            background:
              'repeating-linear-gradient(45deg, rgba(59,130,246,0.08), rgba(59,130,246,0.08) 10px, rgba(59,130,246,0.18) 10px, rgba(59,130,246,0.18) 20px)',
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
          MGID @ {placement}
        </div>
      )}
    </div>
  );
}
