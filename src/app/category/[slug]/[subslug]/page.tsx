import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import {
  getAllCategories,
  getBooksBySubcategory,
  getCategoryBySlug,
  getSubcategory,
} from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { categoryBreadcrumbJsonLd, categoryItemListJsonLd } from '@/lib/jsonld';
import BookCard from '@/components/books/BookCard';
import InlineVideoAd from '@/components/ads/InlineVideoAd';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

interface Props { params: Promise<{ slug: string; subslug: string }>; }

export function generateStaticParams() {
  const params: Array<{ slug: string; subslug: string }> = [];
  for (const cat of getAllCategories()) {
    for (const sub of cat.subcategories ?? []) {
      params.push({ slug: cat.slug, subslug: sub.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subslug } = await params;
  const cat = getCategoryBySlug(slug);
  const sub = getSubcategory(slug, subslug);
  if (!cat || !sub) return { title: 'Підкатегорія не знайдена' };
  const books = getBooksBySubcategory(slug, subslug);
  const title = `${sub.name} — ${cat.name} | UkrBooks`;
  return {
    title,
    description: `${sub.description ?? cat.description}. ${books.length} книг у форматах EPUB та FB2.`,
    keywords: [sub.name, cat.name, `${sub.name} epub`, 'електронні книги'],
    alternates: { canonical: `${BASE}/category/${slug}/${subslug}` },
    openGraph: {
      title: `${sub.name} — ${books.length} книг | UkrBooks`,
      description: sub.description ?? cat.description,
      url: `${BASE}/category/${slug}/${subslug}`,
    },
  };
}

export default async function SubcategoryPage({ params }: Props) {
  const { slug, subslug } = await params;
  const cat = getCategoryBySlug(slug);
  const sub = getSubcategory(slug, subslug);
  if (!cat || !sub) notFound();
  const books = getBooksBySubcategory(slug, subslug);

  const ldBreadcrumb = categoryBreadcrumbJsonLd({ name: `${cat.name} › ${sub.name}`, slug: `${slug}/${subslug}` });
  const ldItemList = categoryItemListJsonLd({ name: sub.name, slug: `${slug}/${subslug}` }, books);

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
            <Link href={`/category/${slug}`} className="hover:text-white transition-colors">{cat.name}</Link>
            <ChevronRight size={11} />
            <span className="text-white/80">{sub.name}</span>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label={cat.name}>{cat.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{sub.name}</h1>
              <p className="text-white/50 mt-1">
                {cat.name} · {pluralizeBooks(books.length)}
              </p>
            </div>
          </div>
          {sub.description && (
            <p className="text-white/60 text-sm mt-3 max-w-2xl">{sub.description}</p>
          )}
        </div>
      </div>

      <div className="container-site py-8">
        {books.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📚</p>
            <p>В цій підкатегорії поки немає книг</p>
            <Link href={`/category/${slug}`} className="inline-block mt-4 underline">
              ← Назад до {cat.name}
            </Link>
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
                <InlineVideoAd placement={`subcategory-${slug}-${subslug}-after-12`} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {books.slice(12, 48).map((book) => (
                    <BookCard key={book.slug} book={book} />
                  ))}
                </div>
                {books.length > 48 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {books.slice(48).map((book) => (
                      <BookCard key={book.slug} book={book} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
