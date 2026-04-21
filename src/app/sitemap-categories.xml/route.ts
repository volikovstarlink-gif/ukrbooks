import { renderUrlSet, sitemapHeaders, type SitemapEntry } from '@/lib/sitemap-xml';
import { getAllCategories } from '@/lib/books';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function GET() {
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = getAllCategories()
    .filter((c) => c.bookCount > 0)
    .map((c) => ({
      url: `${BASE}/category/${c.slug}`,
      lastmod: now,
      changefreq: 'weekly' as const,
      priority: 0.7,
    }));

  return new Response(renderUrlSet(entries), { headers: sitemapHeaders });
}
