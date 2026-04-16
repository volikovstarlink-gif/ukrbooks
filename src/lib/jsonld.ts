/**
 * JSON-LD structured data helpers for SEO
 * https://schema.org
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

// Book page — schema.org/Book
export function bookJsonLd(book: {
  title: string;
  author: string;
  description?: string;
  shortDescription: string;
  coverImage: string;
  slug: string;
  year?: number | null;
  language: string;
  category: string;
  categoryName?: string;
  tags?: string[];
  files: { format: string }[];
}) {
  const langMap: Record<string, string> = { uk: 'uk', en: 'en', ru: 'ru' };

  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    inLanguage: langMap[book.language] || book.language,
    description: book.description
      ? book.description.replace(/<[^>]*>/g, '').slice(0, 500)
      : book.shortDescription,
    url: `${BASE}/book/${book.slug}`,
    image: book.coverImage.startsWith('http')
      ? book.coverImage
      : `${BASE}${book.coverImage}`,
    ...(book.year ? { datePublished: String(book.year) } : {}),
    bookFormat: 'https://schema.org/EBook',
    ...(book.categoryName ? { genre: book.categoryName } : {}),
    ...(book.tags?.length ? { keywords: book.tags.join(', ') } : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
    },
    potentialAction: {
      '@type': 'ReadAction',
      target: `${BASE}/book/${book.slug}`,
    },
  };
}

// Book page — BreadcrumbList
export function bookBreadcrumbJsonLd(book: {
  title: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Головна',
        item: BASE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Каталог',
        item: `${BASE}/catalog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: book.categoryName,
        item: `${BASE}/category/${book.categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: book.title,
        item: `${BASE}/book/${book.slug}`,
      },
    ],
  };
}

// Category page — BreadcrumbList
export function categoryBreadcrumbJsonLd(category: {
  name: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Головна',
        item: BASE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Категорії',
        item: `${BASE}/category`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${BASE}/category/${category.slug}`,
      },
    ],
  };
}

// Homepage — WebSite + Organization + SearchAction
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'UkrBooks',
    alternateName: 'УкрБукс — Українська бібліотека',
    url: BASE,
    description:
      'Онлайн-бібліотека українських книг. Завантажуйте EPUB та FB2 без реєстрації.',
    inLanguage: 'uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE}/catalog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UkrBooks',
    url: BASE,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE}/favicon.ico`,
    },
    description:
      'Онлайн-бібліотека українських книг. Тисячі книг у форматах EPUB та FB2.',
  };
}

// Category page — ItemList of books
export function categoryItemListJsonLd(
  category: { name: string; slug: string },
  books: { title: string; slug: string; author: string; coverImage: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} — книги`,
    url: `${BASE}/category/${category.slug}`,
    numberOfItems: books.length,
    itemListElement: books.slice(0, 20).map((book, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Book',
        name: book.title,
        author: { '@type': 'Person', name: book.author },
        url: `${BASE}/book/${book.slug}`,
        image: book.coverImage.startsWith('http')
          ? book.coverImage
          : `${BASE}${book.coverImage}`,
      },
    })),
  };
}
