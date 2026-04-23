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
  /** Top-level category slug (see categories.json) */
  category: string;
  /** Optional sub-category slug within the parent top-level */
  subcategory?: string;
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
  /** AI-classification confidence: high = body-text match, medium = metadata-only, low = guessed fallback */
  categoryConfidence?: 'high' | 'medium' | 'low';
}

export interface Subcategory {
  slug: string;
  name: string;
  description?: string;
  bookCount?: number;
}

export interface Category {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  bookCount: number;
  order: number;
  subcategories?: Subcategory[];
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
