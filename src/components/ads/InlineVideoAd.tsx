'use client';
import { type ReactNode } from 'react';

interface InlineVideoAdProps {
  placement: string;
  /** Rendered when VAST is unavailable (no env, no-fill, or media error). */
  fallback?: ReactNode;
  className?: string;
}

// DISABLED 2026-04-24 — user kept only `ukrbooks-popunder` + `ukrbooks-preroll-pod`.
// Inline VAST videos on catalog/category/book pages are off. `ukrbooks-preroll-pod`
// still runs via VideoAdGate on downloads/reader. Renders fallback if provided.
export default function InlineVideoAd({ fallback = null }: InlineVideoAdProps) {
  return <>{fallback}</>;
}
