import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookBySlug, getDownloadUrl } from '@/lib/books';
import BookReader from '@/components/reader/BookReader';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) return { title: 'Книгу не знайдено' };
  return {
    title: `Читати ${book.title} онлайн — UkrBooks`,
    description: `Онлайн-читач «${book.title}» — ${book.author}. Читайте в браузері без реєстрації.`,
    robots: { index: false, follow: false },
  };
}

export default async function ReaderPage({ params }: Props) {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();

  const epubFile = book.files.find((f) => f.format === 'epub');
  if (!epubFile) notFound();

  const epubUrl = getDownloadUrl(epubFile.filename, epubFile.fileDir);

  return (
    <BookReader
      title={book.title}
      author={book.author}
      slug={book.slug}
      epubUrl={epubUrl}
    />
  );
}
