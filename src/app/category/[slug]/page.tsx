import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import { getAllCategories, getBooksByCategory, getCategoryBySlug } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { categoryBreadcrumbJsonLd, categoryItemListJsonLd } from '@/lib/jsonld';
import BookCard from '@/components/books/BookCard';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import InlineVideoAd from '@/components/ads/InlineVideoAd';

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
    title: `${cat.name} — книги завантажити EPUB FB2 | UkrBooks`,
    description: `${cat.description}. ${books.length} книг у форматах EPUB та FB2. Завантаження без реєстрації.`,
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
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();
  const books = getBooksByCategory(slug);

  const ldBreadcrumb = categoryBreadcrumbJsonLd({ name: cat.name, slug });
  const ldItemList = categoryItemListJsonLd({ name: cat.name, slug }, books);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }} />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          {/* Breadcrumbs */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {books.slice(0, 12).map((book) => (
                <BookCard key={book.slug} book={book} />
              ))}
            </div>
            {books.length > 12 && (
              <>
                <InlineVideoAd
                  placement="category-after-12"
                  fallback={<AdsterraBanner size="728x90" placement="category-after-12" />}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {books.slice(12, 36).map((book) => (
                    <BookCard key={book.slug} book={book} />
                  ))}
                </div>
                {books.length > 36 && (
                  <>
                    <AdsterraBanner size="728x90" placement="category-after-36" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {books.slice(36).map((book) => (
                        <BookCard key={book.slug} book={book} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
