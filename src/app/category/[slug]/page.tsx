import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllCategories, getBooksByCategory, getCategoryBySlug } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';
import BookCard from '@/components/books/BookCard';
import Link from 'next/link';

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return { title: 'Категорія не знайдена' };
  return {
    title: cat.name,
    description: `${cat.description}. Безкоштовне завантаження EPUB та FB2.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();
  const books = getBooksByCategory(slug);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <Link href="/category" className="text-sm text-white/60 hover:text-white mb-4 block">← Категорії</Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{cat.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{cat.name}</h1>
              <p className="text-white/50 mt-1">{pluralizeBooks(books.length)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="container-site py-8">
        {books.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📚</p>
            <p>В цій категорії поки немає книг</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
