import type { Metadata } from 'next';
import { getAllCategories, getFeaturedBooks, getNewArrivals, getTotalBooks } from '@/lib/books';
import { websiteJsonLd, organizationJsonLd } from '@/lib/jsonld';
import HeroSection from '@/components/home/HeroSection';
import StatsBanner from '@/components/home/StatsBanner';
import FeaturedBooks from '@/components/home/FeaturedBooks';
import CategoryGrid from '@/components/home/CategoryGrid';
import NewArrivals from '@/components/home/NewArrivals';
import MissionBand from '@/components/home/MissionBand';
import DisplayBanner from '@/components/ads/DisplayBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export async function generateMetadata(): Promise<Metadata> {
  const total = getTotalBooks();
  const formatted = total.toLocaleString('uk-UA');
  return {
    title: 'UkrBooks — Українська книгарня онлайн · EPUB та FB2 безкоштовно',
    description: `Українська книгарня онлайн: ${formatted} книг у EPUB та FB2. Класика, сучасна проза, фантастика, поезія. Без реєстрації, без оплати — заходь, обирай, читай.`,
    keywords: [
      'українська книгарня онлайн',
      'українські книги',
      'українська література',
      'читати онлайн',
      'читати безкоштовно',
      'книги українською безкоштовно',
      'epub',
      'fb2',
      'електронні книги українською',
      'бібліотека онлайн',
      'ukrbooks',
      'класика українською',
    ],
    alternates: { canonical: BASE },
    openGraph: {
      title: 'UkrBooks — українська книгарня онлайн',
      description: `${formatted} українських книг у відкритих форматах. Класика й сучасність, завжди безкоштовно, без реєстрації.`,
      url: BASE,
      type: 'website',
      locale: 'uk_UA',
    },
  };
}

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
      <HeroSection totalBooks={total} featuredBooks={featured.slice(0, 10)} />
      <StatsBanner totalBooks={total} totalCategories={activeCategoryCount} />
      <CategoryGrid categories={categories} />
      <FeaturedBooks books={featured} />
      <NewArrivals books={newArrivals} />
      <div className="container-site">
        <DisplayBanner size="300x250" placement="home-after-new-arrivals" />
      </div>
      <MissionBand />
    </>
  );
}
