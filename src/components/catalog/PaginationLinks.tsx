import Link from 'next/link';

interface Props {
  current: number;
  total: number;
  basePath: string;
  firstHref?: string;
}

function getPages(current: number, total: number): (number | '...')[] {
  const out: (number | '...')[] = [];
  const delta = 1;
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  out.push(1);
  if (rangeStart > 2) out.push('...');
  for (let i = rangeStart; i <= rangeEnd; i++) out.push(i);
  if (rangeEnd < total - 1) out.push('...');
  if (total > 1) out.push(total);
  return out;
}

export default function PaginationLinks({ current, total, basePath, firstHref }: Props) {
  if (total <= 1) return null;
  const pages = getPages(current, total);
  const hrefFor = (page: number) => (page === 1 && firstHref ? firstHref : `${basePath}/${page}`);

  return (
    <nav className="pagination" aria-label="Пагінація">
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1)}
          className="pagination-btn"
          aria-label="Попередня сторінка"
          rel="prev"
        >
          ←
        </Link>
      ) : (
        <span className="pagination-btn" aria-disabled="true" style={{ opacity: 0.4, pointerEvents: 'none' }}>←</span>
      )}

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
        ) : page === current ? (
          <span
            key={page}
            className="pagination-btn active"
            aria-current="page"
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            className="pagination-btn"
          >
            {page}
          </Link>
        )
      )}

      {current < total ? (
        <Link
          href={hrefFor(current + 1)}
          className="pagination-btn"
          aria-label="Наступна сторінка"
          rel="next"
        >
          →
        </Link>
      ) : (
        <span className="pagination-btn" aria-disabled="true" style={{ opacity: 0.4, pointerEvents: 'none' }}>→</span>
      )}
    </nav>
  );
}
