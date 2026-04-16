'use client';
import { useEffect, useRef } from 'react';

// Monetag Banner zone IDs — set via env or hardcode after creating zones in Monetag
const BANNER_ZONE_ID = process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE || '';

interface BannerAdProps {
  className?: string;
  size?: '300x250' | '728x90';
}

export default function BannerAd({ className = '', size = '300x250' }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!BANNER_ZONE_ID || !containerRef.current) return;

    // Clear existing content
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://quge5.com/88/tag.min.js';
    script.async = true;
    script.setAttribute('data-zone', BANNER_ZONE_ID);
    script.setAttribute('data-cfasync', 'false');
    containerRef.current.appendChild(script);
  }, []);

  if (!BANNER_ZONE_ID) return null;

  const [w, h] = size.split('x').map(Number);

  return (
    <div
      className={`flex justify-center items-center ${className}`}
      style={{ minHeight: h, overflow: 'hidden' }}
    >
      <div
        ref={containerRef}
        style={{ width: w, minHeight: h }}
      />
    </div>
  );
}
