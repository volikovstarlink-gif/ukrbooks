'use client';
// Monetag Multitag (zone 230583) is already loaded globally in layout.tsx <head>.
// It automatically activates Vignette Banner (10886947) and other formats sitewide.
// This component is a semantic placeholder — no extra script needed.
export default function BannerAd({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={className} />;
}
