'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  function handleChange(page: number) {
    onChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Build page list with ellipsis
  function getPages(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    const delta = 1; // pages around current

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (rangeStart > 2) pages.push('...');

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) pages.push('...');

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }

  const pages = getPages();

  return (
    <nav className="pagination" aria-label="Пагінація">
      {/* Prev */}
      <button
        className="pagination-btn"
        onClick={() => handleChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Попередня сторінка"
      >
        ←
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={page}
            className={`pagination-btn${page === currentPage ? ' active' : ''}`}
            onClick={() => handleChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        className="pagination-btn"
        onClick={() => handleChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Наступна сторінка"
      >
        →
      </button>
    </nav>
  );
}
