import Link from 'next/link';
import type { Category } from '@/types/book';
import { pluralizeBooks } from '@/lib/utils';

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  const visible = categories.filter(c => c.slug !== 'other' && c.bookCount > 0);
  return (
    <section className="section" style={{ background: 'var(--color-parchment)' }}>
      <div className="container-site">
        <div className="text-center mb-8">
          <h2 className="section-title">Категорії книг</h2>
          <p className="section-subtitle">Знайдіть книгу за жанром або темою</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visible.map((cat) => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className="category-card">
              <span className="text-3xl">{cat.icon}</span>
              <span className="font-semibold text-sm">{cat.name}</span>
              <span className="text-xs opacity-60">{pluralizeBooks(cat.bookCount)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
