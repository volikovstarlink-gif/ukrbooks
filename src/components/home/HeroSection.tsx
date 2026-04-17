import { BookOpen, Download, ShieldCheck, WifiOff } from 'lucide-react';
import type { Book } from '@/types/book';
import HeroSearch from './HeroSearch';
import HeroCarousel from './HeroCarousel';

export default function HeroSection({
  totalBooks,
  featuredBooks,
}: {
  totalBooks: number;
  featuredBooks: Book[];
}) {
  const formatted = totalBooks.toLocaleString('uk-UA');
  return (
    <section
      className="relative flex items-center overflow-hidden motion-reduce:[&_*]:!animate-none"
      style={{
        background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-sapphire) 100%)',
        minHeight: 680,
      }}
    >
      {/* Radial gold glow (top-right) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 15%, rgba(201,168,76,0.22), transparent 60%)',
          animation: 'fade-in 0.8s ease 0.1s backwards',
        }}
      />

      {/* Wheat-stalk accent (bottom-right, desktop only) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="hidden lg:block absolute -right-10 -bottom-8 w-[38%] max-w-[480px] pointer-events-none"
        style={{ color: 'var(--color-gold)', opacity: 0.06, animation: 'fade-in 0.8s ease 0.6s backwards' }}
      >
        <g fill="currentColor">
          <path d="M210 400 Q205 300 215 200 Q220 140 228 80 L230 80 Q222 140 217 200 Q207 300 212 400 Z" />
          <ellipse cx="222" cy="120" rx="10" ry="18" transform="rotate(-18 222 120)" />
          <ellipse cx="206" cy="150" rx="10" ry="18" transform="rotate(18 206 150)" />
          <ellipse cx="224" cy="175" rx="10" ry="18" transform="rotate(-18 224 175)" />
          <ellipse cx="204" cy="200" rx="10" ry="18" transform="rotate(18 204 200)" />
          <ellipse cx="222" cy="225" rx="10" ry="18" transform="rotate(-18 222 225)" />
          <ellipse cx="206" cy="250" rx="10" ry="18" transform="rotate(18 206 250)" />
          <path d="M275 400 Q290 310 295 230 Q300 160 305 100 L307 100 Q302 160 297 230 Q292 310 277 400 Z" />
          <ellipse cx="304" cy="130" rx="9" ry="16" transform="rotate(-14 304 130)" />
          <ellipse cx="290" cy="160" rx="9" ry="16" transform="rotate(14 290 160)" />
          <ellipse cx="306" cy="190" rx="9" ry="16" transform="rotate(-14 306 190)" />
          <ellipse cx="290" cy="220" rx="9" ry="16" transform="rotate(14 290 220)" />
          <ellipse cx="304" cy="250" rx="9" ry="16" transform="rotate(-14 304 250)" />
        </g>
      </svg>

      <div className="container-site relative z-10 py-12 md:py-16">
        {/* SEO h1 — visually hidden; carousel exposes book titles as h2 per slide */}
        <h1 className="sr-only">
          UkrBooks — українська книгарня онлайн. {formatted} книг у EPUB та FB2, без реєстрації.
        </h1>

        {/* Eyebrow */}
        <div
          className="flex items-center gap-3 mb-6"
          style={{ animation: 'fade-in 0.5s ease 0s backwards' }}
        >
          <div
            className="ukraine-accent w-10 h-1 rounded"
            style={{ animation: 'fade-in 0.6s ease 0.1s backwards' }}
          />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            Українська книгарня · онлайн
          </span>
        </div>

        {/* Carousel */}
        <div style={{ animation: 'fade-up 0.6s ease 0.1s backwards' }}>
          <HeroCarousel books={featuredBooks} />
        </div>

        {/* Search */}
        <div className="mt-10" style={{ animation: 'fade-up 0.6s ease 0.3s backwards' }}>
          <HeroSearch />
        </div>

        {/* Trust badges */}
        <ul
          role="list"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6 text-sm mt-6"
          style={{ color: 'rgba(255,255,255,0.78)', animation: 'fade-in 0.6s ease 0.4s backwards' }}
        >
          <li className="flex items-center gap-1.5">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Без реєстрації й оплати</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Download size={15} aria-hidden="true" />
            <span>EPUB · FB2</span>
          </li>
          <li className="flex items-center gap-1.5">
            <BookOpen size={15} aria-hidden="true" />
            <span>Класика та сучасність</span>
          </li>
          <li className="flex items-center gap-1.5">
            <WifiOff size={15} aria-hidden="true" />
            <span>{formatted} книг — читай офлайн</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
