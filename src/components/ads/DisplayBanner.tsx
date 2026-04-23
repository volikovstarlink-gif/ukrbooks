'use client';

export type DisplayBannerSize = '300x250' | '300x100';

interface DisplayBannerProps {
  size: DisplayBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

// DISABLED 2026-04-24 — user kept only `ukrbooks-popunder` + `ukrbooks-preroll-pod`.
// Wraps HilltopBanner which is also null-returning. Retained so pages don't need edits.
export default function DisplayBanner(_props: DisplayBannerProps) {
  return null;
}
