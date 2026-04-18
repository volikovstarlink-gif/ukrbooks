import type { MetadataRoute } from 'next';
import { getPublicDomainBookSlugs, getAllCategories, getAllAuthorSlugs } from '@/lib/books';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getPublicDomainBookSlugs();
  const categories = getAllCategories();
  const authorSlugs = getAllAuthorSlugs();

  const bookUrls = slugs.map((slug) => ({
    url: `${BASE}/book/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const authorUrls = authorSlugs.map((slug) => ({
    url: `${BASE}/author/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: BASE,                lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE}/catalog`,   lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE}/category`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/author`,    lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/dmca`,      lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    ...categoryUrls,
    ...authorUrls,
    ...bookUrls,
  ];
}
