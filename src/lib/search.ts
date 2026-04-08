import Fuse from 'fuse.js';
import { Book } from '@/types/book';

let fuse: Fuse<Book> | null = null;

export function buildSearchIndex(books: Book[]) {
  fuse = new Fuse(books, {
    keys: ['title', 'author', 'description', 'keywords'],
    threshold: 0.3,
  });
}

export function searchBooks(query: string): Book[] {
  if (!fuse) return [];
  return fuse.search(query).map((r) => r.item);
}
