export type BookFormat = 'fb2' | 'epub' | 'pdf';
export type BookLanguage = 'uk' | 'en' | 'ru' | 'other';

export interface BookFile {
  format: BookFormat;
  filename: string;
  fileDir: string;
  sizeMb: number;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  language: BookLanguage;
  year: number | null;
  description?: string;
  shortDescription: string;
  coverImage: string;
  files: BookFile[];
  isFeatured: boolean;
  isNewArrival: boolean;
  downloadCount: number;
  rating: number;
  addedAt: string;
  tags?: string[];
}

export interface Category {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  bookCount: number;
  order: number;
}

export interface BooksIndex {
  books: Book[];
  total: number;
  lastUpdated: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  language?: string;
  format?: string;
}

export type SortOption = 'title' | 'author' | 'year' | 'newest';
