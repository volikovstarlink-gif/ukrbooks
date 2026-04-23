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
  isPublicDomain?: boolean;
  authorDeathYear?: number | null;
  authorSlug?: string;
}) {
  const langMap: Record<string, string> = { uk: 'uk', en: 'en', ru: 'ru' };
  const licenseUrl = book.isPublicDomain === true
    ? 'https://creativecommons.org/publicdomain/mark/1.0/'
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author,
      ...(book.authorSlug ? { url: `${BASE}/author/${book.authorSlug}` } : {}),
      ...(book.authorDeathYear ? { deathDate: String(book.authorDeathYear) } : {}),
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
    isAccessibleForFree: true,
    ...(licenseUrl ? { license: licenseUrl } : {}),
    usageInfo: `${BASE}/dmca`,
    ...(book.isPublicDomain === true && book.year
      ? { copyrightNotice: `Public Domain (опубліковано ${book.year})` }
      : {}),
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
      url: `${BASE}/icons/icon-512.png`,
      width: 512,
      height: 512,
    },
    description:
      'Онлайн-бібліотека українських книг. Тисячі книг у форматах EPUB та FB2.',
    email: 'info@ukrbooks.ink',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@ukrbooks.ink',
        availableLanguage: ['uk', 'en'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'copyright agent',
        email: 'dmca@ukrbooks.ink',
        availableLanguage: ['uk', 'en'],
      },
    ],
  };
}

// Generic BreadcrumbList — use instead of ad-hoc inline JSON in pages.
export function breadcrumbListJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// Generic CollectionPage — for /catalog, /category (index), /author (index).
export function collectionPageJsonLd(opts: {
  name: string;
  url: string;
  description: string;
  numberOfItems?: number;
  inLanguage?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    url: opts.url,
    description: opts.description,
    inLanguage: opts.inLanguage || 'uk',
    ...(typeof opts.numberOfItems === 'number' ? { numberOfItems: opts.numberOfItems } : {}),
    isPartOf: { '@type': 'WebSite', name: 'UkrBooks', url: BASE },
  };
}

// Person schema with sameAs links (Wikipedia, Wikidata) — stronger E-E-A-T.
export function authorPersonJsonLd(opts: {
  name: string;
  url: string;
  sameAs?: string[];
  deathYear?: number | null;
  birthYear?: number | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: opts.name,
    url: opts.url,
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
    ...(opts.birthYear ? { birthDate: String(opts.birthYear) } : {}),
    ...(opts.deathYear ? { deathDate: String(opts.deathYear) } : {}),
  };
}

// FAQ schema for /dmca and similar pages
export function faqPageJsonLd(qa: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
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
