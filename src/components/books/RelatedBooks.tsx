import BookGrid from './BookGrid';
import { Book } from '@/types/book';

interface RelatedBooksProps {
  books: Book[];
  currentBookTitle: string;
}

export default function RelatedBooks({ books }: RelatedBooksProps) {
  return (
    <section className="section" style={{ background: 'var(--parchment)' }}>
      <div className="container-site">
        <p className="section-subtitle">Схожі книги</p>
        <h2 className="section-title">Вам також може сподобатись</h2>
        <BookGrid books={books} columns={4} />
      </div>
    </section>
  );
}
