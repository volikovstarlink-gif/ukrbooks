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
      { userAgent: 'OAI-SearchBot',       disallow: ['/'] },
      { userAgent: 'ChatGPT-User',        disallow: ['/'] },
      { userAgent: 'CCBot',               disallow: ['/'] },
      { userAgent: 'Google-Extended',     disallow: ['/'] },
      { userAgent: 'PerplexityBot',       disallow: ['/'] },
      { userAgent: 'Perplexity-User',     disallow: ['/'] },
      { userAgent: 'Claude-Web',          disallow: ['/'] },
      { userAgent: 'ClaudeBot',           disallow: ['/'] },
      { userAgent: 'anthropic-ai',        disallow: ['/'] },
      { userAgent: 'Amazonbot',           disallow: ['/'] },
      { userAgent: 'Bytespider',          disallow: ['/'] },
      { userAgent: 'cohere-ai',           disallow: ['/'] },
      { userAgent: 'Omgilibot',           disallow: ['/'] },
      { userAgent: 'Omgili',              disallow: ['/'] },
      { userAgent: 'FacebookBot',         disallow: ['/'] },
      { userAgent: 'meta-externalagent',  disallow: ['/'] },
      { userAgent: 'Meta-ExternalAgent',  disallow: ['/'] },
      { userAgent: 'Meta-ExternalFetcher',disallow: ['/'] },
      { userAgent: 'ImagesiftBot',        disallow: ['/'] },
      { userAgent: 'Diffbot',             disallow: ['/'] },
      { userAgent: 'AI2Bot',              disallow: ['/'] },
      { userAgent: 'Applebot-Extended',   disallow: ['/'] },
      { userAgent: 'DuckAssistBot',       disallow: ['/'] },
      { userAgent: 'MistralAI-User',      disallow: ['/'] },
      { userAgent: 'PanguBot',            disallow: ['/'] },
      { userAgent: 'Scrapy',              disallow: ['/'] },
      { userAgent: 'SemrushBot',          disallow: ['/'] },
      { userAgent: 'AhrefsBot',           disallow: ['/'] },
      { userAgent: 'MJ12bot',             disallow: ['/'] },
      { userAgent: 'DotBot',              disallow: ['/'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
