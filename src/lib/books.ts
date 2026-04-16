import { cache } from 'react';
import booksIndex from '@/data/books-index.json';
import categoriesData from '@/data/categories.json';
import type { Book, Category, BooksIndex } from '@/types/book';

const index = booksIndex as BooksIndex;
const categories = categoriesData as Category[];

export const getAllBooks = cache((): Book[] => index.books);

/** Lightweight version for catalog/search — strips full HTML description to reduce payload ~40% */
export const getAllBooksSummary = cache((): Omit<Book, 'description'>[] =>
  index.books.map(({ description: _desc, ...rest }) => rest)
);

export const getBookBySlug = cache((slug: string): Book | undefined =>
  index.books.find((b) => b.slug === slug)
);

export const getBooksByCategory = cache((categorySlug: string): Book[] =>
  index.books.filter((b) => b.category === categorySlug)
);

export const getFeaturedBooks = cache((limit = 8): Book[] =>
  index.books.filter((b) => b.isFeatured).slice(0, limit)
);

export const getNewArrivals = cache((limit = 8): Book[] =>
  index.books.filter((b) => b.isNewArrival).slice(0, limit)
);

export const getRelatedBooks = cache((book: Book, limit = 4): Book[] =>
  index.books
    .filter((b) => b.category === book.category && b.slug !== book.slug)
    .slice(0, limit)
);

export const getAllBookSlugs = cache((): string[] =>
  index.books.map((b) => b.slug)
);

export const getAllCategories = cache((): Category[] =>
  categories.sort((a, b) => a.order - b.order)
);

export const getCategoryBySlug = cache((slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug)
);

export const getTotalBooks = (): number => index.total;

export const getDownloadUrl = (filename: string, fileDir: string): string => {
  const base = process.env.NEXT_PUBLIC_BOOKS_BASE_URL || '/api/download';
  return `${base}/${encodeURIComponent(fileDir)}/${encodeURIComponent(filename)}`;
};
