'use client';
import { useEffect, type RefObject } from 'react';
import { trackBannerClick } from './ads-analytics';

// Third-party ad banners render inside sandboxed cross-origin iframes, so
// click events inside the iframe are invisible to our JS. This hook infers
// a click when the window loses focus (or the tab becomes hidden) while the
// pointer is over the banner container. Accuracy ~80%: false positives on
// Cmd+Tab-while-hovering, false negatives when a click opens a background
// tab without blurring. For payment-grade numbers, trust the ad network's
// own dashboard — this is a directional signal for the admin panel only.
export function useAdClickTracker(
  containerRef: RefObject<HTMLElement | null>,
  network: string,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    let hovered = false;
    let clickFired = false;

    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const maybeFire = () => {
      if (!hovered || clickFired) return;
      clickFired = true;
      trackBannerClick(network);
    };
    const onBlur = () => {
      window.setTimeout(maybeFire, 0);
    };
    const onVisibilityChange = () => {
      if (document.hidden) maybeFire();
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [containerRef, network, enabled]);
}
