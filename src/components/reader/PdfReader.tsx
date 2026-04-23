'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Point pdf.js at the copy we ship from /public so we do not depend on
// Next's bundler URL rewriting (which differs between dev/prod).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfReaderProps {
  title: string;
  author: string;
  slug: string;
  pdfUrl: string;
}

// Zoom ladder. Index 2 (1.0) is the default.
const ZOOM_STEPS = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0];
const DEFAULT_ZOOM_INDEX = 2;

export default function PdfReader({ title, author, slug, pdfUrl }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNum, setPageNum] = useState<number>(1);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const progressKey = `reader-progress-${slug}`;
  const zoomKey = 'reader-pdf-zoom-index';

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  // Restore saved page + zoom on mount. Needs a client-side effect
  // because localStorage is not available during SSR; the one-time
  // sync into state is the idiomatic pattern (same as BookReader).
  useEffect(() => {
    try {
      const savedPage = window.localStorage.getItem(progressKey);
      if (savedPage) {
        const p = parseInt(savedPage, 10);
        if (Number.isFinite(p) && p > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPageNum(p);
        }
      }
    } catch {
      /* localStorage blocked */
    }
  }, [progressKey]);

  useEffect(() => {
    try {
      const savedZoom = window.localStorage.getItem(zoomKey);
      if (savedZoom !== null) {
        const z = parseInt(savedZoom, 10);
        if (Number.isFinite(z) && z >= 0 && z < ZOOM_STEPS.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setZoomIndex(z);
        }
      }
    } catch {
      /* localStorage blocked */
    }
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(zoomKey, String(zoomIndex));
    } catch {
      /* ignore */
    }
  }, [zoomIndex]);

  const persistPage = useCallback(
    (p: number) => {
      try {
        window.localStorage.setItem(progressKey, String(p));
      } catch {
        /* ignore */
      }
    },
    [progressKey],
  );

  const handlePrev = useCallback(() => {
    setPageNum((p) => {
      if (p <= 1) return p;
      const next = p - 1;
      persistPage(next);
      // Scroll the page container back to top so the user sees the
      // start of the new page instead of being stuck at the bottom
      // when they paged backwards from a long page.
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: 0 });
      });
      return next;
    });
  }, [persistPage]);

  const handleNext = useCallback(() => {
    setPageNum((p) => {
      if (p >= numPages) return p;
      const next = p + 1;
      persistPage(next);
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: 0 });
      });
      return next;
    });
  }, [numPages, persistPage]);

  // Keyboard shortcuts: ← / → turn pages (match EPUB reader).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePrev, handleNext]);

  const decreaseZoom = () => setZoomIndex((i) => Math.max(0, i - 1));
  const increaseZoom = () => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));

  // Swipe — mirrors the EPUB reader's outer handler.
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) && dt <= 600) {
      if (dx > 0) handlePrev();
      else handleNext();
    }
  };

  const onDocLoad = useCallback((pdf: { numPages: number }) => {
    setNumPages(pdf.numPages);
    // Clamp restored page if pdf is shorter than saved position.
    setPageNum((p) => Math.min(p, pdf.numPages));
  }, []);

  const onDocError = useCallback((err: Error) => {
    console.error('PdfReader: load error', err);
    setLoadError('Не вдалося завантажити PDF. Спробуйте оновити сторінку.');
  }, []);

  // Compute page width: fit container minus small padding, scaled by zoom.
  // Falls back to 800px until container measures.
  const pageWidth = Math.max(120, Math.round((containerWidth || 800) * ZOOM_STEPS[zoomIndex] - 16));

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: 'var(--color-cream)', zIndex: 60 }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: '#fff', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate leading-tight" style={{ color: 'var(--color-ink)' }}>
            {title}
          </div>
          <div className="text-xs truncate leading-tight" style={{ color: 'var(--color-muted)' }}>
            {author}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={decreaseZoom}
            disabled={zoomIndex === 0}
            className="px-2 py-1 rounded text-sm font-medium transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Зменшити масштаб"
            style={{ color: 'var(--color-ink)' }}
          >
            A−
          </button>
          <button
            onClick={increaseZoom}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            className="px-2 py-1 rounded text-base font-semibold transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Збільшити масштаб"
            style={{ color: 'var(--color-ink)' }}
          >
            A+
          </button>
          <Link
            href={`/book/${slug}`}
            className="ml-1 p-1.5 rounded transition-colors hover:bg-gray-100"
            aria-label="Закрити читач"
            style={{ color: 'var(--color-ink)' }}
          >
            <X size={18} />
          </Link>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
               style={{ color: 'var(--color-ink)' }}>
            <p className="text-sm">{loadError}</p>
            <Link href={`/book/${slug}`} className="btn btn-primary btn-md">
              Повернутись до книги
            </Link>
          </div>
        ) : (
          <div className="min-h-full flex items-start justify-center py-3">
            <Document
              file={file}
              onLoadSuccess={onDocLoad}
              onLoadError={onDocError}
              loading={
                <div className="text-sm py-10" style={{ color: 'var(--color-muted)' }}>
                  Завантаження PDF…
                </div>
              }
              error={
                <div className="text-sm py-10" style={{ color: 'var(--color-muted)' }}>
                  Не вдалося завантажити PDF.
                </div>
              }
            >
              {numPages > 0 && (
                <Page
                  pageNumber={pageNum}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={
                    <div className="text-xs py-8" style={{ color: 'var(--color-muted)' }}>
                      Рендер сторінки…
                    </div>
                  }
                />
              )}
            </Document>
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: '#fff', borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={handlePrev}
          disabled={pageNum <= 1}
          className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          style={{ color: 'var(--color-ink)' }}
          aria-label="Попередня сторінка"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, numPages)}
            value={pageNum}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isFinite(v)) return;
              const clamped = Math.min(Math.max(v, 1), Math.max(1, numPages));
              setPageNum(clamped);
              persistPage(clamped);
            }}
            className="w-14 px-1 py-0.5 text-xs rounded border tabular-nums text-center"
            style={{ color: 'var(--color-ink)', borderColor: 'var(--color-border)' }}
            aria-label="Перейти на сторінку"
          />
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: numPages > 0 ? `${Math.round((pageNum / numPages) * 100)}%` : '0%',
                background: 'var(--color-gold)',
              }}
            />
          </div>
          <div
            className="text-xs tabular-nums min-w-[3ch] text-right"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Всього сторінок"
          >
            {numPages > 0 ? numPages : '—'}
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={numPages > 0 && pageNum >= numPages}
          className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          style={{ color: 'var(--color-ink)' }}
          aria-label="Наступна сторінка"
        >
          <span className="hidden sm:inline">Далі</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
