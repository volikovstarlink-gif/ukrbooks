'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Library, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Book } from '@/types/book';

const AUTOPLAY_MS = 6500;
const SWIPE_THRESHOLD = 50;

export default function HeroCarousel({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = books.length;

  const goTo = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (paused || count <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > SWIPE_THRESHOLD) prev();
    else if (dx < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
  };

  if (!count) return null;

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Рекомендовані книги"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <div className="relative">
        {books.map((book, i) => {
          const active = i === index;
          return (
            <div
              key={book.slug}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} з ${count}: ${book.title}`}
              aria-hidden={!active}
              className={`transition-opacity duration-500 ${active ? 'opacity-100 relative' : 'opacity-0 pointer-events-none absolute inset-0'}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] gap-6 md:gap-10 items-center">
                {/* Cover */}
                <Link
                  href={`/book/${book.slug}`}
                  className="block mx-auto md:mx-0 w-[180px] md:w-full max-w-[260px] group"
                  tabIndex={active ? 0 : -1}
                  aria-label={`Відкрити сторінку книги ${book.title}`}
                >
                  <div
                    className="relative aspect-[2/3] rounded-lg overflow-hidden transition-transform duration-300 group-hover:-translate-y-1"
                    style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.25)' }}
                  >
                    <Image
                      src={book.coverImage}
                      alt={`${book.title} — ${book.author}`}
                      fill
                      sizes="(min-width: 1024px) 260px, (min-width: 768px) 220px, 180px"
                      priority={i === 0}
                      quality={92}
                      className="object-cover"
                    />
                  </div>
                </Link>

                {/* Text */}
                <div className="text-white">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3"
                    style={{ color: 'var(--color-gold)' }}
                  >
                    Рекомендуємо · {i + 1} / {count}
                  </div>
                  <h2
                    className="font-display font-bold leading-[1.05] mb-2"
                    style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)' }}
                  >
                    {book.title}
                  </h2>
                  <p className="text-base md:text-lg mb-4" style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {book.author}
                  </p>
                  {(book.shortDescription || book.description) && (
                    <p
                      className="text-sm md:text-base mb-6 leading-[1.6]"
                      style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '52ch' }}
                    >
                      {truncate(book.shortDescription || book.description || '', 180)}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <Link
                      href={`/book/${book.slug}`}
                      className="btn btn-primary btn-lg w-full sm:w-auto justify-center"
                      style={{ minHeight: 52 }}
                      tabIndex={active ? 0 : -1}
                    >
                      <BookOpen size={18} aria-hidden="true" />
                      Читати
                    </Link>
                    <Link
                      href="/catalog"
                      className="btn btn-secondary btn-lg w-full sm:w-auto justify-center"
                      style={{ minHeight: 52 }}
                      tabIndex={active ? 0 : -1}
                    >
                      <Library size={18} aria-hidden="true" />
                      Усі книги
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrow controls (desktop) */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Попередня книга"
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-2 lg:-left-4 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Наступна книга"
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-2 lg:-right-4 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {books.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Показати книгу ${i + 1}`}
                aria-current={active ? 'true' : undefined}
                className="rounded-full transition-all"
                style={{
                  height: 8,
                  width: active ? 28 : 8,
                  background: active ? 'var(--color-gold)' : 'rgba(255,255,255,0.35)',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
