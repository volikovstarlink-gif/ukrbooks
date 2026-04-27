'use client';
import { useEffect, useRef } from 'react';

interface MgidWidgetProps {
  placement: string;
  className?: string;
  minHeight?: number;
}

const SITE_ID = process.env.NEXT_PUBLIC_MGID_SITE_ID;
const WIDGET_ID = process.env.NEXT_PUBLIC_MGID_WIDGET_ID;
const ENABLED = process.env.NEXT_PUBLIC_MGID_ENABLED === '1';

// MGID native recommendation widget. Off by default — flip the env switch
// in Vercel after the publisher dashboard approves the widget for the site
// (site 1091981, submitted 2026-04-22). To activate without redeploying
// existing call sites: set NEXT_PUBLIC_MGID_ENABLED=1 + WIDGET_ID, redeploy.
export default function MgidWidget({ placement, className, minHeight = 250 }: MgidWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ENABLED || !SITE_ID || !WIDGET_ID) return;
    const host = hostRef.current;
    if (!host) return;
    // Insert MGID loader once per page. Each widget gets its own
    // <div data-type="_mgwidget" data-widget-id="..."> child that the
    // loader picks up after script loads.
    const loaderId = 'mgid-loader-' + SITE_ID;
    if (!document.getElementById(loaderId)) {
      const s = document.createElement('script');
      s.id = loaderId;
      s.src = `https://jsc.mgid.com/site/${SITE_ID}.js`;
      s.async = true;
      document.body.appendChild(s);
    }
    return () => {
      // Don't remove the global loader — other widgets may still need it.
      // The host div itself is GC'd when this component unmounts.
    };
  }, []);

  if (!ENABLED || !SITE_ID || !WIDGET_ID) return null;

  return (
    <div
      ref={hostRef}
      className={className}
      data-placement={placement}
      style={{ minHeight }}
    >
      <div data-type="_mgwidget" data-widget-id={WIDGET_ID} />
    </div>
  );
}
