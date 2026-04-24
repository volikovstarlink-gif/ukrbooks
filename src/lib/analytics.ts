import { sendBeacon } from './beacon';

export function trackEvent(
  eventName: string,
  parameters?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;

  window.gtag('event', eventName, parameters);
}

export function trackBookDownload(bookTitle: string, author: string, format: string, bookSlug?: string) {
  trackEvent('book_download', {
    book_title: bookTitle,
    book_author: author,
    file_format: format,
    content_type: 'book',
  });
  if (bookSlug) {
    sendBeacon('/api/track/download', { bookSlug, bookTitle, format });
  }
}

export function trackReadOnline(bookTitle: string, author: string, bookSlug: string) {
  trackEvent('read_online_click', {
    book_title: bookTitle,
    book_author: author,
    book_slug: bookSlug,
    content_type: 'book',
  });
}

// Fires a Google Ads conversion. Reads AW id + label from public env vars.
// Label override lets us plug in a second conversion action (e.g. read-online)
// once the user creates one in the Ads console; today both actions share the
// default label until a dedicated one is added.
export function trackAdsConversion(params?: {
  label?: string;
  value?: number;
  currency?: string;
  transactionId?: string;
}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const defaultLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
  const label = params?.label ?? defaultLabel;
  if (!adsId || !label) return;
  const payload: Record<string, string | number> = {
    send_to: `${adsId}/${label}`,
    value: params?.value ?? 1,
    currency: params?.currency ?? 'UAH',
  };
  if (params?.transactionId) payload.transaction_id = params.transactionId;
  window.gtag('event', 'conversion', payload);
}

export function trackBookView(bookTitle: string, category: string) {
  trackEvent('book_view', {
    book_title: bookTitle,
    book_category: category,
  });
}

export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    search_term: query,
    results_count: resultsCount,
  });
}

export function trackCategoryView(categoryName: string, categorySlug: string) {
  trackEvent('category_view', {
    category_name: categoryName,
    category_slug: categorySlug,
  });
}
