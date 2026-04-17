import { trackEvent } from './analytics';

export function trackAdGateOpen(bookSlug: string, format: string): void {
  trackEvent('ad_gate_open', { book_slug: bookSlug, file_format: format });
}

export function trackAdImpression(network: string, adIndex: number): void {
  trackEvent('ad_impression', { ad_network: network, ad_index: adIndex });
}

export function trackAdQuartile(quartile: string, adIndex: number, network: string): void {
  trackEvent('ad_quartile', { quartile, ad_index: adIndex, ad_network: network });
}

export function trackAdNoFill(network: string, fallbackUsed: string): void {
  trackEvent('ad_nofill', { ad_network: network, fallback_used: fallbackUsed });
}

export function trackAdError(network: string, errorCode: string): void {
  trackEvent('ad_error', { ad_network: network, error_code: errorCode });
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
}

export function trackBannerImpression(placement: string): void {
  trackEvent('banner_impression', { placement });
}

export function trackBannerClick(placement: string): void {
  trackEvent('banner_click', { placement });
}
