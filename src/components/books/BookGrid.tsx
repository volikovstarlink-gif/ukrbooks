import { Book } from '@/types/book';
import { cn } from '@/lib/utils';
import BookCard from '@/components/books/BookCard';

interface BookGridProps {
  books: Book[];
  columns?: 2 | 3 | 4 | 5;
}

const columnClasses: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
};

export default function BookGrid({ books, columns = 4 }: BookGridProps) {
  return (
    <div className={cn('grid gap-6', columnClasses[columns])}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
