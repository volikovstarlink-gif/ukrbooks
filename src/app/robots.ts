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
      // Block AI content scrapers that don't respect copyright
      { userAgent: 'GPTBot',              disallow: ['/'] },
      { userAgent: 'GPTBot-User',         disallow: ['/'] },
      { userAgent: 'CCBot',               disallow: ['/'] },
      { userAgent: 'Google-Extended',     disallow: ['/'] },
      { userAgent: 'PerplexityBot',       disallow: ['/'] },
      { userAgent: 'Claude-Web',          disallow: ['/'] },
      { userAgent: 'Amazonbot',           disallow: ['/'] },
      { userAgent: 'Bytespider',          disallow: ['/'] },
      { userAgent: 'cohere-ai',           disallow: ['/'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
