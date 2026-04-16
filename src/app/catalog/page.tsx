import type { Metadata } from 'next';
import { getAllBooksSummary, getAllCategories } from '@/lib/books';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
  title: 'Каталог книг',
  description: 'Перегляньте всі книги. Фільтруйте за категорією, мовою, форматом.',
};

export default function CatalogPage() {
  const books = getAllBooksSummary();
  const categories = getAllCategories();
  return <CatalogClient books={books} categories={categories} />;
}
