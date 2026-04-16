import Link from 'next/link';
import { BookOpen, Download, Library } from 'lucide-react';

export default function HeroSection({ totalBooks }: { totalBooks: number }) {
  return (
    <section
      className="relative min-h-[520px] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-sapphire) 100%)' }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="container-site relative z-10 py-16 md:py-24">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="ukraine-accent w-8 h-1 rounded" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Степова Бібліотека
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            Бібліотека{' '}
            <span style={{ color: 'var(--color-gold)' }}>Українського</span>
            <br />Слова
          </h1>

          <p className="text-lg text-white/70 mb-8 leading-relaxed">
            {totalBooks.toLocaleString('uk-UA')} книг у форматах EPUB та FB2 — без реєстрації.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/catalog" className="btn btn-primary btn-lg">
              <Library size={18} />
              Переглянути каталог
            </Link>
            <Link href="/category" className="btn btn-secondary btn-lg">
              <BookOpen size={18} />
              Категорії
            </Link>
          </div>

          <div className="flex items-center gap-6 mt-8 text-sm text-white/50">
            <div className="flex items-center gap-1.5">
              <Download size={14} />
              <span>Безкоштовно</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} />
              <span>EPUB + FB2</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
