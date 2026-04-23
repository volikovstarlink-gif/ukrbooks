import Link from 'next/link';
import { BookOpen } from 'lucide-react';

const CATEGORIES = [
  { slug: 'ukr-literature', name: 'Українська література' },
  { slug: 'fiction', name: 'Фантастика' },
  { slug: 'detective', name: 'Детективи' },
  { slug: 'classic', name: 'Класика' },
  { slug: 'history', name: 'Історія' },
  { slug: 'romance', name: 'Романи' },
  { slug: 'children', name: 'Дитячі книги' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--color-ink)', color: 'rgba(255,255,255,0.7)' }}>
      <div className="ukraine-accent" />
      <div className="container-site py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={20} style={{ color: 'var(--color-gold)' }} aria-hidden="true" />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--color-gold)' }}>
                UkrBooks
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-70 mb-4">
              Онлайн-бібліотека українських книг. Завантажуйте EPUB та FB2 без реєстрації.
            </p>
            <p className="text-xs opacity-40">
              Понад 8000 книг у форматах EPUB та FB2
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Бібліотека
            </h3>
            <nav aria-label="Нижня навігація" className="flex flex-col gap-2 text-sm">
              {[
                { href: '/', label: 'Головна' },
                { href: '/catalog', label: 'Каталог книг' },
                { href: '/category', label: 'Жанри та категорії' },
                { href: '/author', label: 'Автори' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Популярні жанри
            </h3>
            <nav aria-label="Категорії книг" className="flex flex-col gap-2 text-sm">
              {CATEGORIES.map(({ slug, name }) => (
                <Link key={slug} href={`/category/${slug}`} className="hover:text-white transition-colors">
                  {name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Інформація
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">
                Про проєкт
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Контакти
              </Link>
              <Link href="/dmca" className="hover:text-white transition-colors">
                Авторські права (DMCA)
              </Link>
              <Link href="/report" className="hover:text-white transition-colors">
                Повідомити про порушення
              </Link>
              <Link href="/transparency" className="hover:text-white transition-colors">
                Звіт прозорості
              </Link>
              <Link href="/changelog" className="hover:text-white transition-colors">
                Історія оновлень
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Умови використання
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Конфіденційність
              </Link>
              <Link href="/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </nav>
          </div>
        </div>

        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-50"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span>© {year} UkrBooks. Всі права захищені.</span>
          <span>Формати: EPUB · FB2 · PDF</span>
        </div>
      </div>
    </footer>
  );
}
