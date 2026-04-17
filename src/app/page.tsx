import type { Metadata } from 'next';
import { getAllCategories, getFeaturedBooks, getNewArrivals, getTotalBooks } from '@/lib/books';
import { websiteJsonLd, organizationJsonLd } from '@/lib/jsonld';
import HeroSection from '@/components/home/HeroSection';
import StatsBanner from '@/components/home/StatsBanner';
import FeaturedBooks from '@/components/home/FeaturedBooks';
import CategoryGrid from '@/components/home/CategoryGrid';
import NewArrivals from '@/components/home/NewArrivals';
import MonetagBanner from '@/components/ads/MonetagBanner';
import AdsterraBanner from '@/components/ads/AdsterraBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'UkrBooks — Бібліотека українських книг | EPUB та FB2',
  description:
    'Онлайн-бібліотека українських книг. Тисячі творів у форматах EPUB та FB2 — класика, сучасна проза, фантастика, дитячі книги. Без реєстрації.',
  keywords: [
    'українські книги',
    'epub завантажити',
    'fb2 книги',
    'електронні книги українською',
    'бібліотека онлайн',
    'ukrbooks',
    'читати онлайн',
    'скачати книги',
  ],
  alternates: { canonical: BASE },
  openGraph: {
    title: 'UkrBooks — Бібліотека українських книг',
    description: 'Тисячі книг у форматах EPUB та FB2. Без реєстрації.',
    url: BASE,
    type: 'website',
    locale: 'uk_UA',
  },
};

export default function HomePage() {
  const featured = getFeaturedBooks(12);
  const newArrivals = getNewArrivals(12);
  const categories = getAllCategories();
  const total = getTotalBooks();
  const activeCategoryCount = categories.filter(c => c.slug !== 'other' && c.bookCount > 0).length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <HeroSection totalBooks={total} />
      <StatsBanner totalBooks={total} totalCategories={activeCategoryCount} />
      <FeaturedBooks books={featured} />
      <div className="container-site">
        <MonetagBanner placement="home-after-featured" minHeight={120} />
      </div>
      <CategoryGrid categories={categories} />
      <div className="container-site">
        <AdsterraBanner size="728x90" placement="home-after-categories" />
      </div>
      <NewArrivals books={newArrivals} />
    </>
  );
}
