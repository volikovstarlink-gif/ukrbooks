import Link from 'next/link';
import { BookX, Search } from 'lucide-react';
import { getAllCategories, getFeaturedBooks } from '@/lib/books';
import BookCard from '@/components/books/BookCard';

export default function NotFound() {
  const categories = getAllCategories().filter((c) => c.slug !== 'other' && c.bookCount > 0);
  const featured = getFeaturedBooks(6);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
      <div className="container-site py-12">
        <div className="text-center mb-10">
          <BookX size={56} className="mx-auto mb-4" style={{ color: 'var(--color-muted)', opacity: 0.5 }} />
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">Сторінку не знайдено</h1>
          <p className="text-gray-500 mb-6">Можливо, книга змінила адресу або була видалена на запит правовласника.</p>

          {/* Search form — works via catalog's ?q= */}
          <form action="/catalog" method="get" className="max-w-md mx-auto flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                type="search"
                name="q"
                placeholder="Шукати книгу або автора…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white"
                style={{ border: '1px solid var(--color-border)' }}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-sapphire)' }}
            >
              Шукати
            </button>
          </form>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/" className="btn btn-primary btn-md">На головну</Link>
            <Link href="/catalog" className="btn btn-secondary btn-md">Каталог</Link>
            <Link href="/dmca" className="btn btn-secondary btn-md">Книгу видалено?</Link>
          </div>
        </div>

        {/* Popular categories */}
        {categories.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold mb-4 text-center">Спробуйте категорію</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.slice(0, 9).map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors hover:bg-white"
                  style={{ background: '#fff', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
                >
                  {c.icon} {c.name} <span style={{ color: 'var(--color-muted)' }}>· {c.bookCount}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured fallback */}
        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold mb-4 text-center">Або почніть з редакційної добірки</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {featured.map((b) => (
                <BookCard key={b.slug} book={b} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
