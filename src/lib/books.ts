import { Book } from '@/types/book';

export async function getAllBooks(): Promise<Book[]> {
  // TODO: implement — read all JSON files from src/data/books/
  return [];
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const books = await getAllBooks();
  return books.find((b) => b.slug === slug) ?? null;
}

export async function getFeaturedBooks(): Promise<Book[]> {
  const books = await getAllBooks();
  return books.filter((b) => b.featured);
}
