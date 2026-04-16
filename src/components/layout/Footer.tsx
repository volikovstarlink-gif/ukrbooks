import Link from 'next/link';
import { BookOpen } from 'lucide-react';

const CATEGORIES = [
  { slug: 'ukr-literature', name: 'Українська література' },
  { slug: 'fiction', name: 'Фантастика' },
  { slug: 'detective', name: 'Детективи' },
  { slug: 'classic', name: 'Класика' },
  { slug: 'history', name: 'Історія' },
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-ink)', color: 'rgba(255,255,255,0.7)' }}>
      <div className="ukraine-accent" />
      <div className="container-site py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={20} style={{ color: 'var(--color-gold)' }} />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--color-gold)' }}>
                UkrBooks
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-70">
              Безкоштовна бібліотека. Читайте та завантажуйте книги у форматах EPUB та FB2.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Навігація
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              {[
                { href: '/', label: 'Головна' },
                { href: '/catalog', label: 'Каталог книг' },
                { href: '/category', label: 'Категорії' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Категорії
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              {CATEGORIES.map(({ slug, name }) => (
                <Link
                  key={slug}
                  href={`/category/${slug}`}
                  className="hover:text-white transition-colors"
                >
                  {name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div
          className="mt-8 pt-6 text-center text-xs opacity-50"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          © {new Date().getFullYear()} UkrBooks. Всі права захищені.
        </div>
      </div>
    </footer>
  );
}
