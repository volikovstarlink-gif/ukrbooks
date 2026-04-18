import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllCategories, getAllBooks } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import AdsterraBanner from '@/components/ads/AdsterraBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Категорії книг — жанри та теми',
  description:
    'Вибирайте книги за жанром: українська класика, фантастика, детективи, поезія, дитячі книги та інші категорії. Завантаження EPUB та FB2.',
  keywords: ['жанри книг', 'категорії', 'українська класика', 'фантастика', 'детективи', 'дитячі книги'],
  alternates: { canonical: `${BASE}/category` },
};

export default function CategoriesPage() {
  const categories = getAllCategories().filter((c) => c.slug !== 'other');
  const books = getAllBooks();
  const counts = Object.fromEntries(
    categories.map((c) => [c.slug, books.filter((b) => b.category === c.slug).length])
  );
  // Only show categories with at least 1 book
  const visibleCats = categories.filter((c) => (counts[c.slug] || 0) > 0);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Категорії</h1>
          <p className="text-white/50">Оберіть жанр для перегляду книг</p>
        </div>
      </div>
      <div className="container-site py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleCats.map((cat) => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className="category-card">
              <span className="text-4xl">{cat.icon}</span>
              <span className="font-semibold text-sm text-center leading-snug">{cat.name}</span>
              <span className="text-xs opacity-60">{pluralizeBooks(counts[cat.slug] || 0)}</span>
            </Link>
          ))}
        </div>
        <AdsterraBanner size="728x90" placement="categories-list-bottom" />
      </div>
    </div>
  );
}
