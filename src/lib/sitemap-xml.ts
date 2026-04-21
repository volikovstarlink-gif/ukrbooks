/**
 * Tiny XML builder for sitemap responses — no deps.
 * Chunks url-sets so we can split one sitemap per resource type.
 */

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts: string[] = [];
      parts.push(`<loc>${escape(e.url)}</loc>`);
      if (e.lastmod) parts.push(`<lastmod>${escape(e.lastmod)}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (typeof e.priority === 'number') parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
      return `<url>${parts.join('')}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function renderSitemapIndex(entries: Array<{ loc: string; lastmod?: string }>): string {
  const body = entries
    .map(
      (e) =>
        `<sitemap><loc>${escape(e.loc)}</loc>${
          e.lastmod ? `<lastmod>${escape(e.lastmod)}</lastmod>` : ''
        }</sitemap>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export const sitemapHeaders = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};
