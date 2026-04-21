'use client';

import { useState, type ReactNode } from 'react';
import { Flag } from 'lucide-react';
import ReportDialog, { type ReportType } from './ReportDialog';

interface Props {
  children?: ReactNode;
  variant?: 'link' | 'primary';
  reportType?: ReportType;
  bookTitle?: string;
  className?: string;
}

export default function ReportButton({
  children,
  variant = 'link',
  reportType = 'copyright',
  bookTitle,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);

  if (variant === 'primary') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
          style={{ background: 'var(--color-sapphire)' }}
        >
          {children || (
            <>
              <Flag size={15} /> Подати скаргу
            </>
          )}
        </button>
        <ReportDialog
          open={open}
          onClose={() => setOpen(false)}
          defaultType={reportType}
          bookTitle={bookTitle}
        />
      </>
    );
  }

  // link variant — subtle, used on book page sidebar and footer
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs transition-colors hover:opacity-100 ${className}`}
        style={{ color: 'var(--color-muted)', opacity: 0.75 }}
      >
        <Flag size={12} />
        {children || 'Повідомити про порушення'}
      </button>
      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultType={reportType}
        bookTitle={bookTitle}
      />
    </>
  );
}
