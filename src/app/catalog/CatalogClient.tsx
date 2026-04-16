'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { Book, Category } from '@/types/book';
type BookSummary = Omit<Book, 'description'>;
import { searchBooks } from '@/lib/search';
import { pluralizeBooks } from '@/lib/utils';
import BookCard from '@/components/books/BookCard';

const PAGE_SIZE = 24;

const LANGUAGES = [
  { value: 'uk', label: 'Українська' },
  { value: 'ru', label: 'Російська' },
  { value: 'en', label: 'Англійська' },
];
const FORMATS = [
  { value: 'epub', label: 'EPUB' },
  { value: 'fb2', label: 'FB2' },
];
const SORT_OPTIONS = [
  { value: 'title', label: 'За назвою' },
  { value: 'author', label: 'За автором' },
  { value: 'year', label: 'За роком' },
  { value: 'newest', label: 'Нові першими' },
];

interface Props { books: BookSummary[]; categories: Category[]; }

export default function CatalogClient({ books, categories }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive state from URL params (single source of truth)
  const query    = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const language = searchParams.get('language') || '';
  const format   = searchParams.get('format') || '';
  const sort     = searchParams.get('sort') || 'title';
  const page     = Math.max(1, Number(searchParams.get('page') || '1'));

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Helper — update one or more URL params and reset to page 1
  const updateParams = useCallback((updates: Record<string, string>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (resetPage) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setQuery    = useCallback((v: string) => updateParams({ q: v }), [updateParams]);
  const setCategory = useCallback((v: string) => updateParams({ category: v }), [updateParams]);
  const setLanguage = useCallback((v: string) => updateParams({ language: v }), [updateParams]);
  const setFormat   = useCallback((v: string) => updateParams({ format: v }), [updateParams]);
  const setSort     = useCallback((v: string) => updateParams({ sort: v === 'title' ? '' : v }), [updateParams]);
  const setPage     = useCallback((p: number) => updateParams({ page: p > 1 ? String(p) : '' }, false), [updateParams]);

  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const hasFilters = Boolean(query || category || language || format);

  const filtered = useMemo(() => {
    let result = query ? searchBooks(books, query) : [...books];
    if (category) result = result.filter((b) => b.category === category);
    if (language) result = result.filter((b) => b.language === language);
    if (format) result = result.filter((b) => b.files.some((f) => f.format === format));
    if (!query) {
      result.sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title, 'uk');
        if (sort === 'author') return a.author.localeCompare(b.author, 'uk');
        if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0);
        if (sort === 'newest') return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        return 0;
      });
    }
    return result;
  }, [books, query, category, language, format, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-6">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Каталог книг</h1>
          <p className="text-sm text-white/50">{pluralizeBooks(filtered.length)}</p>
        </div>
      </div>
      <div className="container-site py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <FilterPanel categories={categories} category={category}
              setCategory={setCategory}
              language={language} setLanguage={setLanguage}
              format={format} setFormat={setFormat}
              onReset={resetFilters} />
          </aside>
          <div className="flex-1 min-w-0">
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Пошук за назвою, автором..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  style={{ borderColor: 'var(--color-border)', background: '#fff' }} />
                {query && (
                  <button onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button className="lg:hidden flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm bg-white"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => setFiltersOpen(!filtersOpen)}>
                <SlidersHorizontal size={15} />
                Фільтри
                {hasFilters && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
              </button>
            </div>
            {filtersOpen && (
              <div className="lg:hidden mb-4 p-4 rounded-lg border"
                style={{ background: '#fff', borderColor: 'var(--color-border)' }}>
                <FilterPanel categories={categories} category={category}
                  setCategory={setCategory}
                  language={language} setLanguage={setLanguage}
                  format={format} setFormat={setFormat}
                  onReset={resetFilters} />
              </div>
            )}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {category && <FilterChip label={categories.find(c => c.slug === category)?.name || category}
                  onRemove={() => setCategory('')} />}
                {language && <FilterChip label={LANGUAGES.find(l => l.value === language)?.label || language}
                  onRemove={() => setLanguage('')} />}
                {format && <FilterChip label={format.toUpperCase()} onRemove={() => setFormat('')} />}
                <button onClick={resetFilters}
                  className="text-xs px-2 py-1 rounded-full text-red-600 border border-red-200 hover:bg-red-50">
                  Скинути все
                </button>
              </div>
            )}
            {paginated.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginated.map((book) => <BookCard key={book.slug} book={book} />)}
                </div>
                {totalPages > 1 && (
                  <Pagination page={safePage} totalPages={totalPages}
                    onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ categories, category, setCategory, language, setLanguage, format, setFormat, onReset }: {
  categories: Category[]; category: string; setCategory: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  format: string; setFormat: (v: string) => void; onReset: () => void;
}) {
  return (
    <div className="rounded-xl p-4 space-y-5 sticky top-20"
      style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Фільтри</span>
        <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-600">Скинути</button>
      </div>
      <FilterSection title="Категорія">
        <button className="w-full text-left text-sm py-1 px-2 rounded transition-colors"
          style={{ background: !category ? 'var(--color-sapphire)' : 'transparent', color: !category ? '#fff' : 'var(--color-ink)' }}
          onClick={() => setCategory('')}>Всі категорії</button>
        {categories.filter(c => c.slug !== 'other' && c.bookCount > 0).map((c) => (
          <button key={c.slug} className="w-full text-left text-sm py-1 px-2 rounded transition-colors flex items-center gap-1.5"
            style={{ background: category === c.slug ? 'var(--color-sapphire)' : 'transparent', color: category === c.slug ? '#fff' : 'var(--color-ink)' }}
            onClick={() => setCategory(c.slug)}>
            <span>{c.icon}</span><span className="truncate">{c.name}</span>
          </button>
        ))}
      </FilterSection>
      <FilterSection title="Мова">
        {LANGUAGES.map((l) => (
          <FilterRadio key={l.value} label={l.label} checked={language === l.value}
            onChange={() => setLanguage(language === l.value ? '' : l.value)} />
        ))}
      </FilterSection>
      <FilterSection title="Формат">
        {FORMATS.map((f) => (
          <FilterRadio key={f.value} label={f.label} checked={format === f.value}
            onChange={() => setFormat(format === f.value ? '' : f.value)} />
        ))}
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-muted)' }}>{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function FilterRadio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded" />{label}
    </label>
  );
}
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {label}<button onClick={onRemove} className="hover:text-red-500 ml-0.5"><X size={10} /></button>
    </span>
  );
}
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">📚</div>
      <h3 className="font-display text-xl font-semibold mb-2">Книг не знайдено</h3>
      <p className="text-gray-500 mb-4">Спробуйте змінити фільтри або пошуковий запит</p>
      <button onClick={onReset} className="btn btn-primary btn-md">Скинути фільтри</button>
    </div>
  );
}
function Pagination({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40 bg-white"
        style={{ borderColor: 'var(--color-border)' }}>←</button>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={"e" + i} className="px-2 text-gray-400">…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: p === page ? 'var(--color-sapphire)' : '#fff',
              color: p === page ? '#fff' : 'var(--color-ink)',
              border: "1px solid " + (p === page ? 'var(--color-sapphire)' : 'var(--color-border)')
            }}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40 bg-white"
        style={{ borderColor: 'var(--color-border)' }}>→</button>
    </div>
  );
}
