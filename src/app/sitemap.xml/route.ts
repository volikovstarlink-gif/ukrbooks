import { renderSitemapIndex, sitemapHeaders } from '@/lib/sitemap-xml';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function GET() {
  const now = new Date().toISOString();
  const xml = renderSitemapIndex([
    { loc: `${BASE}/sitemap-static.xml`, lastmod: now },
    { loc: `${BASE}/sitemap-categories.xml`, lastmod: now },
    { loc: `${BASE}/sitemap-authors.xml`, lastmod: now },
    { loc: `${BASE}/sitemap-books.xml`, lastmod: now },
  ]);
  return new Response(xml, { headers: sitemapHeaders });
}
