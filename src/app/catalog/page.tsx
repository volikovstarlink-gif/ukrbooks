import type { Metadata } from 'next';
import { getAllBooksSummary, getAllCategories } from '@/lib/books';
import CatalogClient from './CatalogClient';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Каталог книг — EPUB та FB2 завантажити | UkrBooks',
  description:
    'Повний каталог українських книг. Більше 8000 творів у форматах EPUB та FB2. Фільтруйте за категорією, автором, мовою. Без реєстрації.',
  keywords: ['каталог книг', 'epub завантажити', 'fb2 книги', 'електронні книги', 'українська бібліотека'],
  alternates: { canonical: `${BASE}/catalog` },
};

export default function CatalogPage() {
  const books = getAllBooksSummary();
  const categories = getAllCategories();
  return <CatalogClient books={books} categories={categories} />;
}
