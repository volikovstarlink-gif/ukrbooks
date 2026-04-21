import { renderUrlSet, sitemapHeaders, type SitemapEntry } from '@/lib/sitemap-xml';
import { getPublicDomainBookSlugs } from '@/lib/books';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function GET() {
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = getPublicDomainBookSlugs().map((slug) => ({
    url: `${BASE}/book/${slug}`,
    lastmod: now,
    changefreq: 'monthly' as const,
    priority: 0.8,
  }));

  return new Response(renderUrlSet(entries), { headers: sitemapHeaders });
}
