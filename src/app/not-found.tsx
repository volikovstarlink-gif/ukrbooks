import Link from 'next/link';
import { BookX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
      <div className="text-center">
        <BookX size={64} className="mx-auto mb-4" style={{ color: 'var(--color-muted)' }} />
        <h1 className="font-display text-3xl font-bold mb-2">Сторінку не знайдено</h1>
        <p className="text-gray-500 mb-6">Книга або сторінка не існує</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-primary btn-md">На головну</Link>
          <Link href="/catalog" className="btn btn-secondary btn-md">Каталог</Link>
        </div>
      </div>
    </div>
  );
}
