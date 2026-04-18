'use client';
import { useMemo } from 'react';
import AdsterraBanner from './AdsterraBanner';
import HilltopBanner from './HilltopBanner';
import {
  getAdsterraBannerConfig,
  type AdsterraBannerSize,
} from '@/lib/adsterra';
import { getHilltopBannerConfig } from '@/lib/hilltopads';

interface DisplayBannerProps {
  size: AdsterraBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

/**
 * Rotates between Adsterra and HilltopAds banners per placement hash, so
 * every position on the page gets a deterministic assignment (no flashing
 * on route changes). If one of the networks has no key/src configured,
 * always uses the other. This lets us diversify fill without doubling the
 * creative count on each page.
 *
 * Size matching:
 *   - Adsterra: 728x90, 300x250, 320x50
 *   - Hilltop : 300x250, 300x100
 *   Overlap is only 300x250. For other sizes we always fall back to Adsterra.
 */
export default function DisplayBanner({ size, placement, className, compact }: DisplayBannerProps) {
  const network = useMemo<'adsterra' | 'hilltopads'>(() => {
    const adsterraKey = getAdsterraBannerConfig(size).key;
    // Hilltop only offers 300x250 as an overlap size; anything else → Adsterra.
    const hilltopSize = size === '300x250' ? '300x250' : null;
    const hilltopCfg = hilltopSize ? getHilltopBannerConfig(hilltopSize) : null;
    const hilltopConfigured = Boolean(hilltopCfg && (hilltopCfg.src || hilltopCfg.inlineB64));

    if (!adsterraKey && hilltopConfigured) return 'hilltopads';
    if (adsterraKey && !hilltopConfigured) return 'adsterra';
    if (!adsterraKey && !hilltopConfigured) return 'adsterra'; // both empty — dev placeholder

    // Deterministic per-placement coin flip: stable across renders of the
    // same page, so we don't swap networks mid-session. Simple string hash.
    let h = 0;
    for (let i = 0; i < placement.length; i++) h = (h * 31 + placement.charCodeAt(i)) | 0;
    return (h & 1) === 0 ? 'adsterra' : 'hilltopads';
  }, [size, placement]);

  if (network === 'hilltopads' && size === '300x250') {
    return (
      <HilltopBanner size="300x250" placement={placement} className={className} compact={compact} />
    );
  }
  return <AdsterraBanner size={size} placement={placement} className={className} compact={compact} />;
}
