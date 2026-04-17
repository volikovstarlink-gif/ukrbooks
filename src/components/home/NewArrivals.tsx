import Link from 'next/link';
import type { Book } from '@/types/book';
import BookCard from '@/components/books/BookCard';

export default function NewArrivals({ books }: { books: Book[] }) {
  if (!books.length) return null;
  return (
    <section className="section" style={{ background: 'var(--color-cream)' }}>
      <div className="container-site">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="section-title">Щойно на полиці</h2>
            <p className="section-subtitle">Свіжі надходження — дивись перший</p>
          </div>
          <Link
            href="/catalog?sort=newest"
            className="hidden sm:block text-sm font-semibold"
            style={{ color: 'var(--color-sapphire-light)' }}
          >
            Усі нові →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.slice(0, 12).map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
}
