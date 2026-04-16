'use client';

import { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'leaderboard' | 'rectangle' | 'auto';
  adSlotId?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner({ slot, format = 'auto', adSlotId }: AdBannerProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense не завантажено:', err);
    }
  }, []);

  if (!adsenseId) {
    if (process.env.NODE_ENV === 'development') {
      return <AdPlaceholder format={format} slot={slot} />;
    }
    return null;
  }

  return (
    <div className={`ad-banner ad-banner-${format}`} data-ad-slot={slot}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsenseId}
        data-ad-slot={adSlotId || 'auto'}
        data-ad-format={format === 'leaderboard' ? 'horizontal' : format === 'rectangle' ? 'rectangle' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
}

function AdPlaceholder({ format, slot }: { format: string; slot: string }) {
  const dimensions = (
    {
      leaderboard: { width: '100%', height: '90px' },
      rectangle: { width: '300px', height: '250px' },
      auto: { width: '100%', height: '90px' },
    } as Record<string, { width: string; height: string }>
  )[format] || { width: '100%', height: '90px' };

  return (
    <div
      style={{
        ...dimensions,
        background:
          'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #e8e8e8 10px, #e8e8e8 20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '12px',
        border: '1px dashed #ccc',
        margin: '1rem auto',
      }}
    >
      AD PLACEHOLDER [{slot}] ({dimensions.width} × {dimensions.height})
    </div>
  );
}
