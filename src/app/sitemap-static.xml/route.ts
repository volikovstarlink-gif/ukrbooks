import { renderUrlSet, sitemapHeaders, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function GET() {
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [
    { url: `${BASE}`,             lastmod: now, changefreq: 'daily',   priority: 1.0 },
    { url: `${BASE}/catalog`,     lastmod: now, changefreq: 'daily',   priority: 0.9 },
    { url: `${BASE}/category`,    lastmod: now, changefreq: 'weekly',  priority: 0.8 },
    { url: `${BASE}/author`,      lastmod: now, changefreq: 'weekly',  priority: 0.7 },
    { url: `${BASE}/about`,       lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { url: `${BASE}/dmca`,        lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { url: `${BASE}/terms`,       lastmod: now, changefreq: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,     lastmod: now, changefreq: 'yearly',  priority: 0.3 },
    { url: `${BASE}/cookies`,     lastmod: now, changefreq: 'yearly',  priority: 0.3 },
    { url: `${BASE}/contact`,     lastmod: now, changefreq: 'monthly', priority: 0.4 },
    { url: `${BASE}/report`,      lastmod: now, changefreq: 'monthly', priority: 0.3 },
    { url: `${BASE}/transparency`,lastmod: now, changefreq: 'weekly',  priority: 0.5 },
    { url: `${BASE}/changelog`,   lastmod: now, changefreq: 'weekly',  priority: 0.4 },
  ];
  return new Response(renderUrlSet(entries), { headers: sitemapHeaders });
}
