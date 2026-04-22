'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Book, Rendition } from 'epubjs';

interface BookReaderProps {
  title: string;
  author: string;
  slug: string;
  epubUrl: string;
}

// Font-size ladder in percent. Index 2 (100%) is the default.
const FONT_SIZES = [80, 90, 100, 115, 130, 150];
const DEFAULT_FONT_INDEX = 2;

export default function BookReader({ title, author, slug, epubUrl }: BookReaderProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [progress, setProgress] = useState(0);
  const [fontIndex, setFontIndex] = useState(DEFAULT_FONT_INDEX);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const progressKey = `reader-progress-${slug}`;
  const fontKey = 'reader-font-index';

  // Load saved font-size preference on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(fontKey);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (Number.isFinite(idx) && idx >= 0 && idx < FONT_SIZES.length) {
          setFontIndex(idx);
        }
      }
    } catch {
      // localStorage may be blocked (private mode) — just use default
    }
  }, []);

  // Lock body scroll while the reader is mounted so the site scroll
  // behind the fixed overlay doesn't leak through on mobile.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Load and render the EPUB. Dynamic import keeps epubjs (and its DOM
  // dependencies) out of the SSR bundle.
  useEffect(() => {
    if (!viewerRef.current) return;

    let cancelled = false;
    let localBook: Book | null = null;
    let localRendition: Rendition | null = null;

    (async () => {
      try {
        const mod = await import('epubjs');
        if (cancelled) return;
        const ePub = mod.default;

        const book = ePub(epubUrl);
        localBook = book;
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current as HTMLDivElement, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          allowScriptedContent: false,
        });
        localRendition = rendition;
        renditionRef.current = rendition;

        // Register theme — uses site palette (cream background, ink text,
        // sapphire links). Padding keeps text away from side tap-zones.
        rendition.themes.register('ukr', {
          body: {
            color: '#0F1923',
            'font-family': 'Georgia, "Times New Roman", serif',
            'line-height': '1.6',
          },
          p: { 'line-height': '1.6' },
          a: { color: '#1B3A6B' },
          img: { 'max-width': '100%', height: 'auto' },
        });
        rendition.themes.select('ukr');
        rendition.themes.fontSize(`${FONT_SIZES[fontIndex]}%`);

        // Resume from last saved position if we have one.
        let startCfi: string | undefined;
        try {
          startCfi = window.localStorage.getItem(progressKey) || undefined;
        } catch {
          /* ignore */
        }

        await rendition.display(startCfi);
        if (cancelled) return;

        // Build locations table so `percentage` is available on
        // `relocated`. 1024 chars per location is epubjs default.
        void book.locations.generate(1024).catch(() => {
          // Non-fatal: prev/next still work, progress bar just won't move.
        });

        rendition.on('relocated', (location: unknown) => {
          const loc = location as {
            start?: { cfi?: string; percentage?: number };
          };
          if (loc?.start?.cfi) {
            try {
              window.localStorage.setItem(progressKey, loc.start.cfi);
            } catch {
              /* ignore */
            }
          }
          if (typeof loc?.start?.percentage === 'number') {
            setProgress(Math.round(loc.start.percentage * 100));
          }
        });

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('BookReader: failed to load EPUB', err);
          setError('Не вдалося завантажити книгу. Спробуйте оновити сторінку.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        localRendition?.destroy();
      } catch {
        /* ignore */
      }
      try {
        localBook?.destroy();
      } catch {
        /* ignore */
      }
      renditionRef.current = null;
      bookRef.current = null;
    };
    // fontIndex is intentionally excluded — we apply font size via a
    // separate effect so switching size doesn't re-create the book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubUrl, progressKey]);

  // Apply font-size changes to the live rendition and persist choice.
  useEffect(() => {
    const r = renditionRef.current;
    if (r) {
      try {
        r.themes.fontSize(`${FONT_SIZES[fontIndex]}%`);
      } catch {
        /* ignore */
      }
    }
    try {
      window.localStorage.setItem(fontKey, String(fontIndex));
    } catch {
      /* ignore */
    }
  }, [fontIndex]);

  const handlePrev = useCallback(() => {
    try {
      renditionRef.current?.prev();
    } catch {
      /* ignore */
    }
  }, []);

  const handleNext = useCallback(() => {
    try {
      renditionRef.current?.next();
    } catch {
      /* ignore */
    }
  }, []);

  const decreaseFont = () => setFontIndex((i) => Math.max(0, i - 1));
  const increaseFont = () => setFontIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1));

  // Keyboard shortcuts: ← / → turn pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePrev, handleNext]);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: 'var(--color-cream)', zIndex: 60 }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#fff', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-sm sm:text-base truncate"
            style={{ color: 'var(--color-ink)' }}
          >
            {title}
          </div>
          <div
            className="text-xs sm:text-sm truncate"
            style={{ color: 'var(--color-muted)' }}
          >
            {author}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={decreaseFont}
            disabled={fontIndex === 0}
            className="px-2 py-1 rounded text-sm font-medium transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Зменшити шрифт"
            style={{ color: 'var(--color-ink)' }}
          >
            A−
          </button>
          <button
            onClick={increaseFont}
            disabled={fontIndex === FONT_SIZES.length - 1}
            className="px-2 py-1 rounded text-base font-semibold transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Збільшити шрифт"
            style={{ color: 'var(--color-ink)' }}
          >
            A+
          </button>
          <Link
            href={`/book/${slug}`}
            className="ml-2 p-2 rounded transition-colors hover:bg-gray-100"
            aria-label="Закрити читач"
            style={{ color: 'var(--color-ink)' }}
          >
            <X size={18} />
          </Link>
        </div>
      </div>

      {/* Reader surface */}
      <div className="flex-1 relative overflow-hidden">
        {loading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm"
            style={{ color: 'var(--color-muted)' }}
          >
            Завантаження книги…
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            style={{ color: 'var(--color-ink)' }}
          >
            <p className="text-sm">{error}</p>
            <Link
              href={`/book/${slug}`}
              className="btn btn-primary btn-md"
            >
              Повернутись до книги
            </Link>
          </div>
        )}
        <div ref={viewerRef} className="absolute inset-0" />

        {/* Invisible tap zones for mobile — left third = prev, right third = next */}
        <button
          onClick={handlePrev}
          aria-label="Попередня сторінка"
          className="absolute left-0 top-0 bottom-0 w-[20%] sm:w-16 bg-transparent"
        />
        <button
          onClick={handleNext}
          aria-label="Наступна сторінка"
          className="absolute right-0 top-0 bottom-0 w-[20%] sm:w-16 bg-transparent"
        />
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#fff', borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={handlePrev}
          className="flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-ink)' }}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'var(--color-gold)' }}
            />
          </div>
          <div
            className="text-xs tabular-nums min-w-[3ch] text-right"
            style={{ color: 'var(--color-muted)' }}
          >
            {progress}%
          </div>
        </div>
        <button
          onClick={handleNext}
          className="flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-ink)' }}
        >
          <span className="hidden sm:inline">Далі</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
