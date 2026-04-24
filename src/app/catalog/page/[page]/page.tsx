import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import { getPublicDomainBooks } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import { breadcrumbListJsonLd, collectionPageJsonLd } from '@/lib/jsonld';
import BookCard from '@/components/books/BookCard';
import PaginationLinks from '@/components/catalog/PaginationLinks';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const PAGE_SIZE = 24;

export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = 3600;

interface Props { params: Promise<{ page: string }>; }

function getSortedPDBooks() {
  return getPublicDomainBooks()
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'uk'));
}

function getTotalPages() {
  return Math.max(1, Math.ceil(getPublicDomainBooks().length / PAGE_SIZE));
}

export async function generateStaticParams() {
  const total = getTotalPages();
  const pages: { page: string }[] = [];
  for (let i = 2; i <= total; i++) pages.push({ page: String(i) });
  return pages;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const pageNum = Number(page);
  const total = getTotalPages();
  if (!Number.isInteger(pageNum) || pageNum < 2 || pageNum > total) {
    return { title: 'Сторінка не знайдена | UkrBooks' };
  }
  const url = `${BASE}/catalog/page/${pageNum}`;
  return {
    title: `Каталог — сторінка ${pageNum} з ${total} | UkrBooks`,
    description: `Українські книги у вільному доступі — сторінка ${pageNum} з ${total}. Завантажуйте EPUB та FB2 без реєстрації.`,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: `Каталог UkrBooks — сторінка ${pageNum}`,
      description: `Українські книги у вільному доступі. Сторінка ${pageNum} з ${total}.`,
      url,
    },
  };
}

export default async function CatalogPaginatedPage({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  if (pageNum === 1) redirect('/catalog');
  const total = getTotalPages();
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > total) notFound();

  const books = getSortedPDBooks();
  const slice = books.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const breadcrumbLd = breadcrumbListJsonLd([
    { name: 'Головна', url: BASE },
    { name: 'Каталог', url: `${BASE}/catalog` },
    { name: `Сторінка ${pageNum}`, url: `${BASE}/catalog/page/${pageNum}` },
  ]);
  const collectionLd = collectionPageJsonLd({
    name: `Каталог UkrBooks — сторінка ${pageNum}`,
    url: `${BASE}/catalog/page/${pageNum}`,
    description: `Українські книги у вільному доступі. Сторінка ${pageNum} з ${total}.`,
    numberOfItems: books.length,
  });

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <nav aria-label="Навігація" className="flex items-center gap-1.5 text-xs text-white/50 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={11} />Головна
            </Link>
            <ChevronRight size={11} />
            <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
            <ChevronRight size={11} />
            <span className="text-white/80">Сторінка {pageNum}</span>
          </nav>

          <h1 className="font-display text-3xl font-bold text-white">Каталог книг — сторінка {pageNum}</h1>
          <p className="text-white/50 mt-1">
            {pluralizeBooks(books.length)} у вільному доступі · сторінка {pageNum} з {total}
          </p>
          <p className="text-white/60 text-sm mt-3 max-w-2xl">
            Українські книги у форматах EPUB та FB2. Усі представлені тут — публічне надбання
            або не класифіковані як захищені авторським правом. Для повного каталогу з фільтрами
            відкрийте <Link href="/catalog" className="underline hover:text-white">/catalog</Link>.
          </p>
        </div>
      </div>

      <div className="container-site py-8">
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {slice.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <PaginationLinks
            current={pageNum}
            total={total}
            basePath="/catalog/page"
            firstHref="/catalog"
          />
        </div>
      </div>
    </div>
  );
}
