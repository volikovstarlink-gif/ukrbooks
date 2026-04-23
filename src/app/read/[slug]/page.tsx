import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookBySlug, getDownloadUrl } from '@/lib/books';
import ReaderFlow from '@/components/reader/ReaderFlow';

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

  // Prefer EPUB (paginated reflow); fall back to PDF (fixed layout) so
  // books that only ship a PDF can still be read online.
  const epubFile = book.files.find((f) => f.format === 'epub');
  const pdfFile = book.files.find((f) => f.format === 'pdf');
  const chosen = epubFile ?? pdfFile;
  if (!chosen) notFound();

  const fileUrl = getDownloadUrl(chosen.filename, chosen.fileDir);
  const format = chosen.format === 'pdf' ? 'pdf' : 'epub';

  return (
    <ReaderFlow
      title={book.title}
      author={book.author}
      slug={book.slug}
      fileUrl={fileUrl}
      format={format}
    />
  );
}
