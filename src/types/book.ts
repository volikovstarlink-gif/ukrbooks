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
  /** true = verified public domain; false = under copyright; undefined = not yet classified */
  isPublicDomain?: boolean;
  /** Year the author died — used to derive isPublicDomain */
  authorDeathYear?: number | null;
  /** ISO 639-1 code of original language if this is a translation; null = original Ukrainian */
  translatedFrom?: string | null;
  /** Translator name(s), when credited */
  translator?: string | null;
  /** Classifier confidence: high = explicit marker, medium = clearly foreign author, low = guess */
  translationConfidence?: 'high' | 'medium' | 'low';
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
