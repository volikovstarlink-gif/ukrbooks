import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, User } from 'lucide-react';
import { getAllAuthorSlugs, getAuthorBySlug, UNKNOWN_AUTHOR } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { authorPersonJsonLd, breadcrumbListJsonLd } from '@/lib/jsonld';
import authorSameAs from '@/data/author-wikidata.json';
import BookCard from '@/components/books/BookCard';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import InlineVideoAd from '@/components/ads/InlineVideoAd';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const SAMEAS_MAP = authorSameAs as unknown as Record<string, string[]>;

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllAuthorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const author = getAuthorBySlug(slug);
  if (!author) return { title: 'Автора не знайдено' };

  const formats = 'EPUB та FB2';
  const isUnknown = author.name === UNKNOWN_AUTHOR;
  // Noindex if every book by this author is explicitly marked non-public-domain,
  // or if this is the "Невідомий автор" collapse bucket (not a real person).
  const allNonPD = author.books.length > 0 && author.books.every(
    (b) => b.isPublicDomain === false
  );
  const noindex = isUnknown || allNonPD;
  return {
    title: allNonPD || isUnknown
      ? `${author.name} | UkrBooks`
      : `${author.name} — книги завантажити ${formats} | UkrBooks`,
    description: allNonPD || isUnknown
      ? `Книги автора ${author.name} на UkrBooks.`
      : `Всі книги автора ${author.name}. ${author.bookCount} творів у форматах ${formats}. Завантаження без реєстрації на UkrBooks.`,
    keywords: allNonPD || isUnknown ? undefined : [
      author.name,
      `${author.name} epub`,
      `${author.name} fb2`,
      `${author.name} книги`,
      `завантажити ${author.name}`,
      `читати ${author.name} онлайн`,
    ],
    alternates: { canonical: `${BASE}/author/${slug}` },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${author.name} — ${author.bookCount} книг | UkrBooks`,
      description: allNonPD
        ? `Книги ${author.name} на UkrBooks.`
        : `Завантажити книги ${author.name} у форматах EPUB та FB2.`,
      url: `${BASE}/author/${slug}`,
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const sameAs = SAMEAS_MAP[slug];
  // Pick a consistent deathYear if all books agree (most authors have identical values).
  const deathYears = author.books
    .map((b) => (typeof b.authorDeathYear === 'number' ? b.authorDeathYear : null))
    .filter((y): y is number => y !== null);
  const deathYear = deathYears.length > 0 && new Set(deathYears).size === 1 ? deathYears[0] : null;

  const jsonLd = authorPersonJsonLd({
    name: author.name,
    url: `${BASE}/author/${slug}`,
    sameAs,
    deathYear,
  });

  const breadcrumbLd = breadcrumbListJsonLd([
    { name: 'Головна', url: BASE },
    { name: 'Автори', url: `${BASE}/author` },
    { name: author.name, url: `${BASE}/author/${slug}` },
  ]);

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
          {author.books.slice(0, 12).map((book) => (
            <BookCard key={book.slug} book={book as Parameters<typeof BookCard>[0]['book']} />
          ))}
        </div>
        {author.books.length > 12 && (
          <>
            <InlineVideoAd
              placement="author-after-12"
              fallback={<AdsterraBanner size="728x90" placement="author-after-12" />}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {author.books.slice(12, 36).map((book) => (
                <BookCard key={book.slug} book={book as Parameters<typeof BookCard>[0]['book']} />
              ))}
            </div>
            {author.books.length > 36 && (
              <>
                <AdsterraBanner size="728x90" placement="author-after-36" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {author.books.slice(36).map((book) => (
                    <BookCard key={book.slug} book={book as Parameters<typeof BookCard>[0]['book']} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
