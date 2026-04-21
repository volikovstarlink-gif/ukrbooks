import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Calendar, Tag, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { getAllBookSlugs, getBookBySlug, getRelatedBooks, getAllCategories, getDownloadUrl, getDownloadDisplayName, authorToSlug, UNKNOWN_AUTHOR } from '@/lib/books';
import { getCoverUrl } from '@/lib/utils';
import { bookJsonLd, bookBreadcrumbJsonLd } from '@/lib/jsonld';
import BookCard from '@/components/books/BookCard';
import Badge from '@/components/ui/Badge';
import DownloadSection from '@/components/download/DownloadSection';
import type { DownloadItem } from '@/components/download/DownloadSection';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import DisplayBanner from '@/components/ads/DisplayBanner';
import InlineVideoAd from '@/components/ads/InlineVideoAd';
import ReportButton from '@/components/report/ReportButton';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBookSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) return { title: 'Книгу не знайдено' };

  const categories = getAllCategories();
  const category = categories.find((c) => c.slug === book.category);
  const formats = book.files.map(f => f.format.toUpperCase()).join(' та ');
  // Explicitly non-PD books get a neutral title (no download keywords) and noindex
  const isPD = book.isPublicDomain !== false;
  const title = isPD
    ? `${book.title} — ${book.author} | Завантажити ${formats}`
    : `${book.title} — ${book.author} | UkrBooks`;
  const description = book.shortDescription
    ? `${book.shortDescription}${isPD ? ` Завантажити «${book.title}» у форматі ${formats}${book.year ? `, ${book.year}` : ''}.` : ''}`
    : isPD
    ? `Завантажити «${book.title}» — ${book.author} у форматах ${formats}. ${category?.name || ''}. Без реєстрації.`
    : `«${book.title}» — ${book.author}. ${category?.name || ''}. UkrBooks.`;

  const coverUrl = book.coverImage !== '/covers/placeholder.jpg'
    ? (book.coverImage.startsWith('http') ? book.coverImage : `${BASE}${book.coverImage}`)
    : undefined;

  return {
    title,
    description,
    keywords: isPD ? [
      book.title,
      book.author,
      `${book.title} epub`,
      `${book.title} fb2`,
      `${book.author} книги`,
      `завантажити ${book.title}`,
      ...(book.tags || []),
    ] : undefined,
    alternates: { canonical: `${BASE}/book/${slug}` },
    robots: isPD ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${book.title} — ${book.author}`,
      description,
      url: `${BASE}/book/${slug}`,
      type: 'book',
      ...(coverUrl ? { images: [{ url: coverUrl, alt: book.title }] } : {}),
    },
  };
}

const FORMAT_LABEL: Record<string, string> = { epub: 'EPUB', fb2: 'FB2', pdf: 'PDF' };
const LANGUAGE_LABEL: Record<string, string> = { uk: 'Українська', ru: 'Російська', en: 'Англійська' };

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();

  const related = getRelatedBooks(book, 6);
  const categories = getAllCategories();
  const category = categories.find((c) => c.slug === book.category);

  const ldBook = bookJsonLd({
    ...book,
    categoryName: category?.name,
    description: book.description,
    isPublicDomain: book.isPublicDomain,
    authorDeathYear: book.authorDeathYear,
  });

  const ldBreadcrumb = bookBreadcrumbJsonLd({
    title: book.title,
    slug: book.slug,
    categorySlug: book.category,
    categoryName: category?.name || 'Каталог',
  });

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBook) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-sapphire) 100%)' }}>
        <div className="container-site py-8">
          {/* Breadcrumbs */}
          <nav aria-label="Навігація" className="flex items-center gap-1.5 text-xs text-white/50 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={11} />Головна
            </Link>
            <ChevronRight size={11} />
            <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
            {category && (
              <>
                <ChevronRight size={11} />
                <Link href={`/category/${category.slug}`} className="hover:text-white transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight size={11} />
            <span className="text-white/80 truncate max-w-[200px]">{book.title}</span>
          </nav>

          <div className="flex flex-col sm:flex-row gap-8">
            {/* Cover */}
            <div className="flex-shrink-0">
              <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl mx-auto sm:mx-0">
                <Image
                  src={getCoverUrl(book.coverImage)}
                  alt={`${book.title} — обкладинка книги`}
                  fill
                  sizes="180px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {category && (
                <Link href={`/category/${category.slug}`}>
                  <Badge variant="format" className="mb-3">{category.icon} {category.name}</Badge>
                </Link>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
                {book.title}
              </h1>
              {book.author === UNKNOWN_AUTHOR ? (
                <p className="text-lg text-white/70 mb-4 italic">{book.author}</p>
              ) : (
                <Link href={`/author/${authorToSlug(book.author)}`}
                  className="text-lg text-white/70 hover:text-white transition-colors mb-4 block">
                  {book.author}
                </Link>
              )}

              <div className="flex flex-wrap gap-3 mb-6">
                {book.year && (
                  <div className="flex items-center gap-1.5 text-sm text-white/60">
                    <Calendar size={13} />
                    {book.year}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-white/60">
                  <BookOpen size={13} />
                  {LANGUAGE_LABEL[book.language] || book.language}
                </div>
                {book.tags?.slice(0, 3).map((tag) => (
                  <div key={tag} className="flex items-center gap-1 text-sm text-white/60">
                    <Tag size={11} />
                    {tag}
                  </div>
                ))}
              </div>

              {/* Download warning */}
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: 'rgba(251,191,36,0.9)' }}>
                <span>⚠️</span>
                <span>Для завантаження потрібно переглянути <strong>2 коротких рекламних ролики</strong></span>
              </div>

              <DownloadSection
                items={book.files.map((file): DownloadItem => ({
                  format: file.format,
                  filename: getDownloadDisplayName(book.title, file.format),
                  sizeMb: file.sizeMb,
                  downloadUrl: getDownloadUrl(file.filename, file.fileDir),
                }))}
                bookTitle={book.title}
                bookAuthor={book.author}
                bookSlug={book.slug}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-site py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {book.description ? (
              <div className="rounded-xl p-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                <h2 className="font-display text-xl font-semibold mb-4">Про книгу</h2>
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: book.description }}
                />
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center text-gray-400" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                <p>Опис відсутній</p>
              </div>
            )}
            <InlineVideoAd
              placement="book-after-description"
              fallback={<DisplayBanner size="300x250" placement="book-after-description" />}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-3" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Деталі</h3>
              {[
                { label: 'Автор', value: book.author, href: book.author === UNKNOWN_AUTHOR ? undefined : `/author/${authorToSlug(book.author)}` },
                { label: 'Мова', value: LANGUAGE_LABEL[book.language] || book.language, href: undefined },
                { label: 'Рік', value: book.year?.toString(), href: undefined },
                { label: 'Категорія', value: category?.name, href: category ? `/category/${category.slug}` : undefined },
                { label: 'Формати', value: book.files.map((f) => FORMAT_LABEL[f.format]).join(', '), href: undefined },
              ]
                .filter((r) => r.value)
                .map(({ label, value, href }) => (
                  <div key={label} className="flex justify-between text-sm gap-2">
                    <span style={{ color: 'var(--color-muted)' }}>{label}</span>
                    {href ? (
                      <Link href={href} className="font-medium text-right hover:underline" style={{ color: 'var(--color-sapphire)' }}>{value}</Link>
                    ) : (
                      <span className="font-medium text-right">{value}</span>
                    )}
                  </div>
                ))}
            </div>

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-sm uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {book.tags.map(tag => (
                    <Link key={tag} href={`/catalog?q=${encodeURIComponent(tag)}`}
                      className="text-xs px-2 py-1 rounded-full transition-colors"
                      style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <DisplayBanner size="300x250" placement="book-sidebar" />

            {/* Report link — subtle, under all sidebar content */}
            <div className="pt-2 text-center">
              <ReportButton
                variant="link"
                reportType="copyright"
                bookTitle={book.title}
              >
                Повідомити про проблему з цією книгою
              </ReportButton>
            </div>
          </div>
        </div>

        <AdsterraBanner size="728x90" placement="book-before-related" />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="section-title mb-6">Схожі книги</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {related.map((b) => (
                <BookCard key={b.slug} book={b} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
