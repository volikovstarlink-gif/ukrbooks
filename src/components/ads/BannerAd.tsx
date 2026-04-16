'use client';
import { useEffect, useRef } from 'react';

// Zone 10886947 — Vignette Banner (Monetag Strong tag)
const BANNER_ZONE_ID = process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE || '10886947';

export default function BannerAd({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !ref.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://quge5.com/88/tag.min.js';
    script.async = true;
    script.setAttribute('data-zone', BANNER_ZONE_ID);
    script.setAttribute('data-cfasync', 'false');
    document.head.appendChild(script);
  }, []);

  // Invisible mount point — Vignette Banner renders in fixed position automatically
  return <div ref={ref} className={className} />;
}
