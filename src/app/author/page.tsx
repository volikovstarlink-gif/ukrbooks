import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ChevronRight, Users } from 'lucide-react';
import { getAllAuthors } from '@/lib/books';
import { pluralizeBooks } from '@/lib/utils';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Автори — книги завантажити EPUB та FB2',
  description:
    'Повний список авторів бібліотеки UkrBooks. Завантажте книги улюблених письменників у форматах EPUB та FB2 без реєстрації.',
  keywords: ['автори книг', 'письменники epub', 'українські письменники', 'fb2 автори'],
  alternates: { canonical: `${BASE}/author` },
  openGraph: {
    title: 'Автори | UkrBooks',
    description: 'Всі автори бібліотеки UkrBooks — завантажте книги у форматі EPUB та FB2.',
    url: `${BASE}/author`,
  },
};

export default function AuthorsIndexPage() {
  const authors = getAllAuthors();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Автори — UkrBooks',
    url: `${BASE}/author`,
    description: 'Список всіх авторів бібліотеки UkrBooks',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Автори', item: `${BASE}/author` },
    ],
  };

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero */}
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <nav aria-label="Навігація" className="flex items-center gap-1.5 text-xs text-white/50 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home size={11} />Головна
            </Link>
            <ChevronRight size={11} />
            <span className="text-white/80">Автори</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)' }}>
              <Users size={26} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">Автори</h1>
              <p className="text-white/50 mt-1">{authors.length} авторів у бібліотеці</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container-site py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {authors.map((author) => (
            <Link
              key={author.slug}
              href={`/author/${author.slug}`}
              className="group flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
              style={{ background: '#fff', border: '1px solid var(--color-border)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)' }}>
                <span className="font-display font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                  {author.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate group-hover:underline" style={{ color: 'var(--color-ink)' }}>
                  {author.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {pluralizeBooks(author.bookCount)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
