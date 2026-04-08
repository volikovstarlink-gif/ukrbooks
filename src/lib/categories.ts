import { Category } from '@/types/book';
import categoriesData from '@/data/categories.json';

export function getAllCategories(): Category[] {
  return categoriesData as Category[];
}

export function getCategoryBySlug(slug: string): Category | null {
  return getAllCategories().find((c) => c.slug === slug) ?? null;
}
