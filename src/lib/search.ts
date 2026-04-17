import Fuse from 'fuse.js';
import type { Book } from '@/types/book';

type BookSummary = Omit<Book, 'description'>;

let fuseInstance: Fuse<BookSummary> | null = null;

export function initSearch(books: BookSummary[]): Fuse<BookSummary> {
  fuseInstance = new Fuse(books, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'author', weight: 0.4 },
      { name: 'shortDescription', weight: 0.05 },
      { name: 'tags', weight: 0.05 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
  return fuseInstance;
}

export function searchBooks(books: BookSummary[], query: string): BookSummary[] {
  if (!query.trim()) return books;
  const fuse = fuseInstance || initSearch(books);
  return fuse.search(query).map((r) => r.item);
}
