import { renderUrlSet, sitemapHeaders, type SitemapEntry } from '@/lib/sitemap-xml';
import { getCategoriesWithCounts } from '@/lib/books';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function GET() {
  const now = new Date().toISOString();
  const categories = getCategoriesWithCounts().filter((c) => c.bookCount > 0);
  const entries: SitemapEntry[] = [];
  for (const cat of categories) {
    entries.push({
      url: `${BASE}/category/${cat.slug}`,
      lastmod: now,
      changefreq: 'weekly' as const,
      priority: 0.7,
    });
    for (const sub of cat.subcategories ?? []) {
      if ((sub.bookCount ?? 0) > 0) {
        entries.push({
          url: `${BASE}/category/${cat.slug}/${sub.slug}`,
          lastmod: now,
          changefreq: 'weekly' as const,
          priority: 0.6,
        });
      }
    }
  }

  return new Response(renderUrlSet(entries), { headers: sitemapHeaders });
}
