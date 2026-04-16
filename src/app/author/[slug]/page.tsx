import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, User } from 'lucide-react';
import { getAllAuthorSlugs, getAuthorBySlug } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import BookCard from '@/components/books/BookCard';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllAuthorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: 'Автора не знайдено' };

  const formats = 'EPUB та FB2';
  return {
    title: `${author.name} — книги завантажити ${formats} | UkrBooks`,
    description: `Всі книги автора ${author.name}. ${author.bookCount} творів у форматах ${formats}. Завантаження без реєстрації на UkrBooks.`,
    keywords: [
      author.name,
      `${author.name} epub`,
      `${author.name} fb2`,
      `${author.name} книги`,
      `завантажити ${author.name}`,
      `читати ${author.name} онлайн`,
    ],
    alternates: { canonical: `${BASE}/author/${slug}` },
    openGraph: {
      title: `${author.name} — ${author.bookCount} книг | UkrBooks`,
      description: `Завантажити книги ${author.name} у форматах EPUB та FB2.`,
      url: `${BASE}/author/${slug}`,
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${BASE}/author/${slug}`,
    sameAs: [],
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Автори', item: `${BASE}/author` },
      { '@type': 'ListItem', position: 3, name: author.name, item: `${BASE}/author/${slug}` },
    ],
  };

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          {/* Breadcrumbs */}
          <nav aria-label="Навігація" className="flex items-center gap-1.5 text-xs text-white/50 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={11} />Головна
            </Link>
            <ChevronRight size={11} />
            <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
            <ChevronRight size={11} />
            <span className="text-white/80">{author.name}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)' }}>
              <User size={26} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{author.name}</h1>
              <p className="text-white/50 mt-1">{pluralizeBooks(author.bookCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-site py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {author.books.map((book) => (
            <BookCard key={book.slug} book={book as Parameters<typeof BookCard>[0]['book']} />
          ))}
        </div>
      </div>
    </div>
  );
}
