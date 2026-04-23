'use client';
import type { HilltopBannerSize } from '@/lib/hilltopads';

interface HilltopBannerProps {
  size: HilltopBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

// DISABLED 2026-04-24 — user kept only `ukrbooks-popunder` + `ukrbooks-preroll-pod`.
// All display banner slots (300x250, 300x100) return null. Placements in the
// codebase are retained so this can be re-enabled with a single change when
// banner inventory is back in use.
export default function HilltopBanner(_props: HilltopBannerProps) {
  return null;
}
