import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getAllBooksSummary, getAllCategories, getPublicDomainBookSlugs, getTotalBooks } from '@/lib/books';
import { breadcrumbListJsonLd, collectionPageJsonLd } from '@/lib/jsonld';
import CatalogClient from './CatalogClient';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const CATALOG_PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: 'Каталог книг — EPUB та FB2 завантажити',
  description:
    'Повний каталог українських книг. Більше 8000 творів у форматах EPUB та FB2. Фільтруйте за категорією, автором, мовою. Без реєстрації.',
  keywords: ['каталог книг', 'epub завантажити', 'fb2 книги', 'електронні книги', 'українська бібліотека'],
  alternates: { canonical: `${BASE}/catalog` },
};

function CatalogFallback() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-6">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Каталог книг</h1>
          <p className="text-sm text-white/50">Завантаження...</p>
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const books = getAllBooksSummary();
  const categories = getAllCategories();
  const total = getTotalBooks();

  const breadcrumbLd = breadcrumbListJsonLd([
    { name: 'Головна', url: BASE },
    { name: 'Каталог', url: `${BASE}/catalog` },
  ]);
  const collectionLd = collectionPageJsonLd({
    name: 'Каталог книг — UkrBooks',
    url: `${BASE}/catalog`,
    description: `Повний каталог української електронної бібліотеки: ${total} книг у форматах EPUB та FB2.`,
    numberOfItems: total,
  });

  // Crawlable archive — gives Googlebot a real <a href> to every paginated
  // SSG page. Hidden visually so the SPA UX is unchanged for users.
  const totalPDPages = Math.ceil(getPublicDomainBookSlugs().length / CATALOG_PAGE_SIZE);
  const archiveLinks: number[] = [];
  for (let p = 2; p <= totalPDPages; p++) archiveLinks.push(p);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Suspense fallback={<CatalogFallback />}>
        <CatalogClient books={books} categories={categories} />
      </Suspense>
      <nav aria-label="Архів каталогу" className="sr-only">
        <h2>Архів каталогу — сторінки публічного домену</h2>
        <ul>
          {archiveLinks.map((p) => (
            <li key={p}>
              <Link href={`/catalog/page/${p}`}>Сторінка {p}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
