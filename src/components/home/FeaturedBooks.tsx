import Link from 'next/link';
import type { Book } from '@/types/book';
import BookCard from '@/components/books/BookCard';

export default function FeaturedBooks({ books }: { books: Book[] }) {
  if (!books.length) return null;
  return (
    <section className="section" style={{ background: 'var(--color-cream)' }}>
      <div className="container-site">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="section-title">Почни з цих</h2>
            <p className="section-subtitle">Редакційна добірка — класика, що не старіє, і сучасні голоси</p>
          </div>
          <Link
            href="/catalog"
            className="hidden sm:block text-sm font-semibold"
            style={{ color: 'var(--color-sapphire-light)' }}
          >
            Усі книги →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.slice(0, 12).map((book, i) => (
            <BookCard key={book.slug} book={book} priority={i < 4} />
          ))}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link href="/catalog" className="btn btn-secondary btn-md">
            Усі книги
          </Link>
        </div>
      </div>
    </section>
  );
}
