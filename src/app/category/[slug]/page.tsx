import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import {
  getAllCategories,
  getBooksByCategory,
  getCategoryBySlug,
  getCategoriesWithCounts,
} from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { categoryBreadcrumbJsonLd, categoryItemListJsonLd } from '@/lib/jsonld';
import BookCard from '@/components/books/BookCard';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return { title: 'Категорія не знайдена' };
  const books = getBooksByCategory(slug);
  return {
    title: `${cat.name} — ${books.length} книг у форматах EPUB та FB2 | UkrBooks`,
    description: `${cat.description}. ${books.length} книг. Завантаження без реєстрації.`,
    keywords: [cat.name, `${cat.name} epub`, `${cat.name} fb2`, `завантажити ${cat.name.toLowerCase()}`, 'електронні книги'],
    alternates: { canonical: `${BASE}/category/${slug}` },
    openGraph: {
      title: `${cat.name} — ${books.length} книг | UkrBooks`,
      description: `${cat.description}. Завантажити у форматах EPUB та FB2.`,
      url: `${BASE}/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const catWithCounts = getCategoriesWithCounts().find((c) => c.slug === slug);
  const cat = catWithCounts ?? getCategoryBySlug(slug);
  if (!cat) notFound();
  const books = getBooksByCategory(slug);
  const visibleSubs = (catWithCounts?.subcategories ?? []).filter((s) => (s.bookCount ?? 0) > 0);

  // Sample featured books for the top-level overview — one per sub-category when possible
  const featured = visibleSubs
    .map((sub) => books.find((b) => b.subcategory === sub.slug))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .slice(0, 12);
  const featuredFallback = featured.length < 6 ? books.slice(0, 12) : featured;

  const ldBreadcrumb = categoryBreadcrumbJsonLd({ name: cat.name, slug });
  const ldItemList = categoryItemListJsonLd({ name: cat.name, slug }, books);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }} />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <nav aria-label="Навігація" className="flex items-center gap-1.5 text-xs text-white/50 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={11} />Головна
            </Link>
            <ChevronRight size={11} />
            <Link href="/category" className="hover:text-white transition-colors">Категорії</Link>
            <ChevronRight size={11} />
            <span className="text-white/80">{cat.name}</span>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label={cat.name}>{cat.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{cat.name}</h1>
              <p className="text-white/50 mt-1">{pluralizeBooks(books.length)}</p>
            </div>
          </div>
          {cat.description && (
            <p className="text-white/60 text-sm mt-3 max-w-2xl">{cat.description}</p>
          )}
        </div>
      </div>

      <div className="container-site py-8">
        {books.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📚</p>
            <p>В цій категорії поки немає книг</p>
          </div>
        ) : (
          <>
            {visibleSubs.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-xl font-semibold mb-4">Підкатегорії</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {visibleSubs.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/category/${slug}/${sub.slug}`}
                      className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: '#fff', border: '1px solid var(--color-border)' }}
                    >
                      <div className="font-semibold leading-tight">{sub.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                        {pluralizeBooks(sub.bookCount ?? 0)}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-xl font-semibold mb-4">Усі книги</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {featuredFallback.map((book) => (
                  <BookCard key={book.slug} book={book} />
                ))}
              </div>
              {books.length > featuredFallback.length && (
                <div className="text-center mt-8">
                  <Link
                    href={`/catalog?category=${slug}`}
                    className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
                    style={{ background: 'var(--color-ink)', color: '#fff' }}
                  >
                    Переглянути всі {books.length.toLocaleString('uk-UA')} книги →
                  </Link>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
