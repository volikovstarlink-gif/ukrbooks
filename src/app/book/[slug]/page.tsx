import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { getAllBookSlugs, getBookBySlug, getRelatedBooks, getAllCategories, getDownloadUrl } from '@/lib/books';
import { getCoverUrl } from '@/lib/utils';
import BookCard from '@/components/books/BookCard';
import Badge from '@/components/ui/Badge';
import DownloadSection from '@/components/download/DownloadSection';
import type { DownloadItem } from '@/components/download/DownloadSection';

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
  return {
    title: `${book.title} — ${book.author}`,
    description: book.shortDescription || `Завантажте «${book.title}» безкоштовно у форматах EPUB та FB2.`,
    openGraph: {
      title: book.title,
      description: book.shortDescription || '',
      images: book.coverImage !== '/covers/placeholder.jpg' ? [book.coverImage] : [],
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

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-sapphire) 100%)' }}>
        <div className="container-site py-8">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            Назад до каталогу
          </Link>

          <div className="flex flex-col sm:flex-row gap-8">
            {/* Cover */}
            <div className="flex-shrink-0">
              <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl mx-auto sm:mx-0">
                <Image
                  src={getCoverUrl(book.coverImage)}
                  alt={book.title}
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
              <p className="text-lg text-white/70 mb-4">{book.author}</p>

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

              {/* Download buttons with ad gate */}
              <DownloadSection
                items={book.files.map((file): DownloadItem => ({
                  format: file.format,
                  filename: file.filename,
                  sizeMb: file.sizeMb,
                  downloadUrl: getDownloadUrl(file.filename, file.fileDir),
                }))}
                bookTitle={book.title}
                bookAuthor={book.author}
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
              <div
                className="rounded-xl p-6"
                style={{ background: '#fff', border: '1px solid var(--color-border)' }}
              >
                <h2 className="font-display text-xl font-semibold mb-4">Про книгу</h2>
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: book.description }}
                />
              </div>
            ) : (
              <div
                className="rounded-xl p-6 text-center text-gray-400"
                style={{ background: '#fff', border: '1px solid var(--color-border)' }}
              >
                <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                <p>Опис відсутній</p>
              </div>
            )}
          </div>

          {/* Metadata sidebar */}
          <div>
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ background: '#fff', border: '1px solid var(--color-border)' }}
            >
              <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Деталі
              </h3>
              {[
                { label: 'Автор', value: book.author },
                { label: 'Мова', value: LANGUAGE_LABEL[book.language] || book.language },
                { label: 'Рік', value: book.year?.toString() },
                { label: 'Категорія', value: category?.name },
                {
                  label: 'Формати',
                  value: book.files.map((f) => FORMAT_LABEL[f.format]).join(', '),
                },
              ]
                .filter((r) => r.value)
                .map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm gap-2">
                    <span style={{ color: 'var(--color-muted)' }}>{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Related books */}
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
