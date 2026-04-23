import { cache } from 'react';
import booksIndex from '@/data/books-index.json';
import categoriesData from '@/data/categories.json';
import type { Book, Category, Subcategory, BooksIndex } from '@/types/book';

const rawIndex = booksIndex as BooksIndex;
const categories = categoriesData as Category[];

export const UNKNOWN_AUTHOR = 'Невідомий автор';
const UNKNOWN_AUTHOR_PATTERNS = new Set([
  '',
  'unknown',
  'невідомий',
  'невідомий автор',
  'неизвестно',
  'неизвестный',
  'неизвестный автор',
  'пользователь windows',
  'calibre',
  'adobe digital editions',
]);

/** Collapse technical/empty author values so /author doesn't list
 *  Unknown / Пользователь Windows / blank as separate entries.
 *  Also splits on `;` (FB2 metadata sometimes packs multiple authors into one
 *  field and includes "Невідомий автор" as a co-author) and drops the
 *  unknown/empty parts so real authors don't get their own "X; Unknown" entry.
 *  Runtime defense — generate_catalog.py applies the same rule at ingest. */
function normalizeAuthor(raw: string): string {
  if (!raw) return UNKNOWN_AUTHOR;
  const parts = raw
    .split(';')
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter((p) => p && !UNKNOWN_AUTHOR_PATTERNS.has(p.toLowerCase()));
  if (parts.length === 0) return UNKNOWN_AUTHOR;
  return parts.join('; ');
}

// Normalize once up front so every consumer (catalog, book page, author
// listings, JSON-LD) sees the same canonical author string.
const index: BooksIndex = {
  ...rawIndex,
  books: rawIndex.books.map((b) => ({ ...b, author: normalizeAuthor(b.author) })),
};

/** File name the user sees in the browser "Save as…" dialog. The
 *  physical file on R2 may have a noisy name like
 *  "1984-11743__1984__1984.fb2"; this sanitizes it to a readable
 *  "1984.fb2" without touching the storage layer. */
export function getDownloadDisplayName(title: string, format: string): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return `${cleaned || 'book'}.${format}`;
}

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

/** Old flat slugs → new top-level slugs mapping.
 *  Used for 301 redirects when SEO-indexed old URLs land on the site. */
export const OLD_TO_NEW_CATEGORY: Record<string, string> = {
  'ukr-literature': 'literature-ukr',
  'fiction': 'fantasy',
  'detective': 'literature-foreign',
  'romance': 'literature-foreign',
  'classic': 'classics',
  'business': 'business-science',
  'psychology': 'self-help',
  'science': 'business-science',
  'children': 'children',
  'history': 'history',
  'other': 'other',
};

export const getAllCategories = cache((): Category[] =>
  categories.sort((a, b) => a.order - b.order)
);

export const getCategoryBySlug = cache((slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug)
);

export const getSubcategory = cache(
  (categorySlug: string, subSlug: string): Subcategory | undefined =>
    categories.find((c) => c.slug === categorySlug)?.subcategories?.find((s) => s.slug === subSlug)
);

export const getBooksBySubcategory = cache(
  (categorySlug: string, subSlug: string): Book[] =>
    index.books.filter((b) => b.category === categorySlug && b.subcategory === subSlug)
);

/** Compute per-subcategory book counts for the tree nav. */
export const getCategoriesWithCounts = cache((): Category[] => {
  return categories
    .map((cat) => {
      const catBooks = index.books.filter((b) => b.category === cat.slug);
      const subs = (cat.subcategories ?? []).map((s) => ({
        ...s,
        bookCount: catBooks.filter((b) => b.subcategory === s.slug).length,
      }));
      return {
        ...cat,
        bookCount: catBooks.length,
        subcategories: subs,
      };
    })
    .sort((a, b) => a.order - b.order);
});

export const getTotalBooks = (): number => index.total;

export const getDownloadUrl = (filename: string, fileDir: string): string => {
  const base = process.env.NEXT_PUBLIC_BOOKS_BASE_URL || '/api/download';
  return `${base}/${encodeURIComponent(fileDir)}/${encodeURIComponent(filename)}`;
};

/** Convert author name to URL-safe slug — capped at 100 chars so filesystem
 *  paths (e.g. .next/server/app/author/<slug>.segments on Linux ext4 with
 *  255-byte name limit) don't blow up on sprawling titles passed as authors. */
export const authorToSlug = (author: string): string => {
  const s = author
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яёіїєґ0-9-]/gu, '')
    .replace(/-+/g, '-')
    .trim();
  return s.length > 100 ? s.slice(0, 100).replace(/-+$/, '') : s;
};

export interface AuthorSummary {
  name: string;
  slug: string;
  bookCount: number;
  books: Omit<Book, 'description'>[];
}

export const getAllAuthors = cache((): AuthorSummary[] => {
  const map = new Map<string, Omit<Book, 'description'>[]>();
  for (const { description: _d, ...book } of index.books) {
    const existing = map.get(book.author) ?? [];
    existing.push(book);
    map.set(book.author, existing);
  }
  return Array.from(map.entries())
    .map(([name, books]) => ({
      name,
      slug: authorToSlug(name),
      bookCount: books.length,
      books,
    }))
    .sort((a, b) => b.bookCount - a.bookCount);
});

/** Authors suitable for the public /author listing and sitemap.
 *  Excludes the "Невідомий автор" collapse bucket — it's not a real person,
 *  just every book whose metadata lacked a usable author. The bucket page
 *  itself stays reachable via direct URL for links from book cards.
 *  Also excludes authors whose entire catalog is non-public-domain —
 *  their page emits noindex so listing them in sitemap/authors grid
 *  creates a soft-404 signal. */
export const getPublicAuthors = cache((): AuthorSummary[] =>
  getAllAuthors().filter((a) => {
    if (a.name === UNKNOWN_AUTHOR) return false;
    const hasIndexable = a.books.some((b) => b.isPublicDomain !== false);
    return hasIndexable;
  })
);

export const getAuthorBySlug = cache((slug: string): AuthorSummary | undefined =>
  getAllAuthors().find((a) => a.slug === slug)
);

export const getAllAuthorSlugs = cache((): string[] =>
  getAllAuthors().map((a) => a.slug)
);

export const getPublicAuthorSlugs = cache((): string[] =>
  getPublicAuthors().map((a) => a.slug)
);

/** Slugs of books that are confirmed public domain OR not yet classified.
 *  Only books explicitly marked isPublicDomain===false are excluded. */
export const getPublicDomainBookSlugs = cache((): string[] =>
  index.books.filter((b) => b.isPublicDomain !== false).map((b) => b.slug)
);

export const SOURCE_LANGUAGE_LABEL: Record<string, { name: string; flag: string; genitive: string }> = {
  en: { name: 'Англійська', flag: '🇬🇧', genitive: 'англійської' },
  fr: { name: 'Французька', flag: '🇫🇷', genitive: 'французької' },
  de: { name: 'Німецька', flag: '🇩🇪', genitive: 'німецької' },
  pl: { name: 'Польська', flag: '🇵🇱', genitive: 'польської' },
  ru: { name: 'Російська', flag: '🇷🇺', genitive: 'російської' },
  es: { name: 'Іспанська', flag: '🇪🇸', genitive: 'іспанської' },
  it: { name: 'Італійська', flag: '🇮🇹', genitive: 'італійської' },
  ja: { name: 'Японська', flag: '🇯🇵', genitive: 'японської' },
  cz: { name: 'Чеська', flag: '🇨🇿', genitive: 'чеської' },
  sv: { name: 'Шведська', flag: '🇸🇪', genitive: 'шведської' },
  no: { name: 'Норвезька', flag: '🇳🇴', genitive: 'норвезької' },
  pt: { name: 'Португальська', flag: '🇵🇹', genitive: 'португальської' },
  ko: { name: 'Корейська', flag: '🇰🇷', genitive: 'корейської' },
  zh: { name: 'Китайська', flag: '🇨🇳', genitive: 'китайської' },
  ar: { name: 'Арабська', flag: '🇸🇦', genitive: 'арабської' },
  tr: { name: 'Турецька', flag: '🇹🇷', genitive: 'турецької' },
  sl: { name: 'Словенська', flag: '🇸🇮', genitive: 'словенської' },
  other: { name: 'Інша', flag: '🌐', genitive: 'іншої' },
};

/** All books classified as translations (translatedFrom is a non-null language code). */
export const getTranslatedBooks = cache((): Book[] =>
  index.books.filter((b) => b.translatedFrom)
);

/** Translations grouped by source language, sorted by book count desc. */
export const getTranslationsBySourceLanguage = cache((): Array<{ lang: string; books: Book[] }> => {
  const map = new Map<string, Book[]>();
  for (const b of index.books) {
    if (!b.translatedFrom) continue;
    const arr = map.get(b.translatedFrom) ?? [];
    arr.push(b);
    map.set(b.translatedFrom, arr);
  }
  return Array.from(map.entries())
    .map(([lang, books]) => ({ lang, books }))
    .sort((a, b) => b.books.length - a.books.length);
});

/** Featured translations for homepage — prefer cover + high confidence. */
export const getFeaturedTranslations = cache((limit = 8): Book[] => {
  const all = index.books.filter((b) => b.translatedFrom);
  const withCover = all.filter((b) => b.coverImage && b.coverImage !== '/covers/placeholder.jpg');
  const high = withCover.filter((b) => b.translationConfidence === 'high');
  const pool = high.length >= limit ? high : withCover.length >= limit ? withCover : all;
  return pool.slice(0, limit);
});
