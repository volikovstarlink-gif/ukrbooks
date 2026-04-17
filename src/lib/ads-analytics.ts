import { trackEvent } from './analytics';
import { sendBeacon } from './beacon';

function normalizeNetwork(network: string): string {
  return network.replace(/[^a-z0-9_-]/gi, '_').slice(0, 24) || 'unknown';
}

export function trackAdGateOpen(bookSlug: string, format: string): void {
  trackEvent('ad_gate_open', { book_slug: bookSlug, file_format: format });
  sendBeacon('/api/track/ad-event', { type: 'gate_open', network: 'gate' });
}

export function trackAdImpression(network: string, adIndex: number): void {
  trackEvent('ad_impression', { ad_network: network, ad_index: adIndex });
  sendBeacon('/api/track/ad-event', { type: 'impressions', network: normalizeNetwork(network) });
}

export function trackAdQuartile(quartile: string, adIndex: number, network: string): void {
  trackEvent('ad_quartile', { quartile, ad_index: adIndex, ad_network: network });
  sendBeacon('/api/track/ad-event', { type: 'quartile', network: normalizeNetwork(network) });
}

export function trackAdNoFill(network: string, fallbackUsed: string): void {
  trackEvent('ad_nofill', { ad_network: network, fallback_used: fallbackUsed });
  sendBeacon('/api/track/ad-event', { type: 'nofill', network: normalizeNetwork(network) });
}

export function trackAdError(network: string, errorCode: string): void {
  trackEvent('ad_error', { ad_network: network, error_code: errorCode });
  sendBeacon('/api/track/ad-event', {
    type: 'errors',
    network: normalizeNetwork(network),
    errorCode,
  });
}

export function trackDownloadCompleted(
  bookSlug: string,
  adsWatched: number,
  totalWaitSec: number,
): void {
  trackEvent('download_completed', {
    book_slug: bookSlug,
    ads_watched: adsWatched,
    total_wait_sec: totalWaitSec,
  });
  sendBeacon('/api/track/ad-event', { type: 'download_completed', network: 'gate' });
}

export function trackBannerImpression(placement: string): void {
  trackEvent('banner_impression', { placement });
  sendBeacon('/api/track/ad-event', { type: 'impressions', network: normalizeNetwork(placement) });
}

export function trackBannerClick(placement: string): void {
  trackEvent('banner_click', { placement });
  sendBeacon('/api/track/ad-event', { type: 'clicks', network: normalizeNetwork(placement) });
}
