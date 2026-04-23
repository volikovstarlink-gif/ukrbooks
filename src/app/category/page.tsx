import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategoriesWithCounts } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { breadcrumbListJsonLd, collectionPageJsonLd } from '@/lib/jsonld';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Категорії книг — жанри та теми | UkrBooks',
  description:
    'Усі жанри: сучасна українська проза, зарубіжна література, класика, фантастика, поезія, дитячі, історія, нонфікшн, саморозвиток. EPUB та FB2 без реєстрації.',
  keywords: ['жанри книг', 'категорії', 'українська проза', 'зарубіжна література', 'класика', 'фантастика', 'поезія', 'дитячі книги', 'історія'],
  alternates: { canonical: `${BASE}/category` },
};

export default function CategoriesPage() {
  const categories = getCategoriesWithCounts().filter((c) => c.bookCount > 0);

  const breadcrumbLd = breadcrumbListJsonLd([
    { name: 'Головна', url: BASE },
    { name: 'Категорії', url: `${BASE}/category` },
  ]);
  const collectionLd = collectionPageJsonLd({
    name: 'Категорії книг — UkrBooks',
    url: `${BASE}/category`,
    description: 'Жанри української та світової літератури з підкатегоріями.',
    numberOfItems: categories.length,
  });

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Категорії</h1>
          <p className="text-white/50">Оберіть жанр для перегляду книг. Кожен жанр має підкатегорії.</p>
        </div>
      </div>
      <div className="container-site py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="block rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '#fff', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl" role="img" aria-label={cat.name}>{cat.icon}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold leading-tight">{cat.name}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {pluralizeBooks(cat.bookCount)}
                  </p>
                </div>
              </div>
              {cat.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-muted)' }}>
                  {cat.description}
                </p>
              )}
              {cat.subcategories && cat.subcategories.filter((s) => (s.bookCount ?? 0) > 0).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {cat.subcategories
                    .filter((s) => (s.bookCount ?? 0) > 0)
                    .slice(0, 5)
                    .map((s) => (
                      <span
                        key={s.slug}
                        className="inline-block text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-cream)', color: 'var(--color-ink)' }}
                      >
                        {s.name} <span style={{ color: 'var(--color-muted)' }}>· {s.bookCount}</span>
                      </span>
                    ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
