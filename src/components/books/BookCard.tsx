import Image from 'next/image';
import Link from 'next/link';
import type { Book } from '@/types/book';
import { getCoverUrl, truncate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface BookCardProps {
  book: Book;
  priority?: boolean;
}

const FORMAT_LABEL: Record<string, string> = { epub: 'EPUB', fb2: 'FB2', pdf: 'PDF' };

export default function BookCard({ book, priority = false }: BookCardProps) {
  const formats = book.files.map((f) => f.format);

  return (
    <Link href={`/book/${book.slug}`} className="block book-card group">
      {/* Cover */}
      <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
        <Image
          src={getCoverUrl(book.coverImage)}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority={priority}
        />
        {book.isNewArrival && (
          <div className="absolute top-2 left-2">
            <Badge variant="new">Нове</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-display font-semibold text-sm leading-snug mb-1"
          style={{ color: 'var(--color-ink)' }}
          title={book.title}
        >
          {truncate(book.title, 50)}
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
          {truncate(book.author, 40)}
        </p>
        <div className="flex flex-wrap gap-1">
          {formats.map((f) => (
            <Badge key={f} variant="format">{FORMAT_LABEL[f] || f.toUpperCase()}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
