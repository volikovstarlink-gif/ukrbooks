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
