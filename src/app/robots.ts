import type { MetadataRoute } from 'next';
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/admin'],
      },
      {
        // Block AI scrapers that don't respect copyright
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
