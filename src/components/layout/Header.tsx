'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, BookOpen, Search } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Головна' },
  { href: '/catalog', label: 'Каталог' },
  { href: '/category', label: 'Категорії' },
  { href: '/author', label: 'Автори' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{ background: 'var(--color-ink)' }}
      className="sticky top-0 z-50 shadow-lg"
    >
      <div className="ukraine-accent" />
      <div className="container-site flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white no-underline">
          <BookOpen size={22} style={{ color: 'var(--color-gold)' }} />
          <span
            className="font-display text-xl font-bold tracking-wide"
            style={{ color: 'var(--color-gold)' }}
          >
            UkrBooks
          </span>
          <span className="hidden sm:block text-xs text-white/50 mt-0.5">Бібліотека</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium transition-colors"
              style={{
                color: pathname === href ? 'var(--color-gold)' : 'rgba(255,255,255,0.8)',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/catalog"
            aria-label="Пошук"
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <Search size={20} />
          </Link>
          <button
            className="md:hidden text-white/70 hover:text-white p-1"
            onClick={() => setOpen(!open)}
            aria-label="Меню"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-nav" style={{ background: 'var(--color-ink)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <nav className="container-site py-4 flex flex-col gap-3">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium py-1"
                style={{ color: pathname === href ? 'var(--color-gold)' : 'rgba(255,255,255,0.8)' }}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
