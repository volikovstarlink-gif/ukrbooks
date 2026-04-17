'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable = target?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/catalog?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className="relative flex items-center w-full max-w-xl rounded-xl bg-white/95 backdrop-blur-sm shadow-lg h-12 md:h-14 pl-4 pr-1.5"
    >
      <Search size={18} aria-hidden="true" style={{ color: 'var(--color-muted)' }} />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQuery('');
        }}
        placeholder="Шукайте за назвою, автором або темою…"
        aria-label="Пошук книг"
        enterKeyHint="search"
        className="flex-1 bg-transparent px-3 text-base outline-none placeholder:text-[color:var(--color-muted)]"
        style={{ color: 'var(--color-ink)' }}
      />
      <button
        type="submit"
        aria-label="Шукати"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-sm h-9 md:h-11 px-3 md:px-4 transition-colors"
        style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
      >
        <span className="hidden md:inline">Шукати</span>
        <ArrowRight size={16} aria-hidden="true" className="md:hidden" />
        <ArrowRight size={16} aria-hidden="true" className="hidden md:inline" />
      </button>
    </form>
  );
}
