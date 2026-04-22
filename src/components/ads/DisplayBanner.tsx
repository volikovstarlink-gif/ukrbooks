'use client';
import HilltopBanner from './HilltopBanner';
import { getHilltopBannerConfig } from '@/lib/hilltopads';

export type DisplayBannerSize = '300x250' | '300x100';

interface DisplayBannerProps {
  size: DisplayBannerSize;
  placement: string;
  className?: string;
  compact?: boolean;
}

export default function DisplayBanner({ size, placement, className, compact }: DisplayBannerProps) {
  const cfg = getHilltopBannerConfig(size);
  const configured = Boolean(cfg.src || cfg.inlineB64 || cfg.staticFile);
  if (!configured && process.env.NODE_ENV !== 'development') return null;
  return <HilltopBanner size={size} placement={placement} className={className} compact={compact} />;
}
