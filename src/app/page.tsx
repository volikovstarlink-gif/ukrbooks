import { getAllCategories, getFeaturedBooks, getNewArrivals, getTotalBooks } from '@/lib/books';
import HeroSection from '@/components/home/HeroSection';
import StatsBanner from '@/components/home/StatsBanner';
import FeaturedBooks from '@/components/home/FeaturedBooks';
import CategoryGrid from '@/components/home/CategoryGrid';
import NewArrivals from '@/components/home/NewArrivals';

export default function HomePage() {
  const featured = getFeaturedBooks(12);
  const newArrivals = getNewArrivals(12);
  const categories = getAllCategories();
  const total = getTotalBooks();
  const activeCategoryCount = categories.filter(c => c.slug !== 'other' && c.bookCount > 0).length;

  return (
    <>
      <HeroSection totalBooks={total} />
      <StatsBanner totalBooks={total} totalCategories={activeCategoryCount} />
      <FeaturedBooks books={featured} />
      <CategoryGrid categories={categories} />
      <NewArrivals books={newArrivals} />
    </>
  );
}
