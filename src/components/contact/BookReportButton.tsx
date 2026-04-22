'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import ContactDialog from './ContactDialog';

interface Props {
  bookTitle: string;
  variant?: 'inline' | 'sidebar';
}

export default function BookReportButton({ bookTitle, variant = 'inline' }: Props) {
  const [open, setOpen] = useState(false);

  const sizeClasses =
    variant === 'sidebar'
      ? 'w-full justify-center px-4 py-2.5 rounded-xl text-xs font-bold'
      : 'px-2.5 py-1 rounded-md text-xs font-bold';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Повідомити про проблему з цією книгою"
        aria-label="Повідомити про проблему"
        className={`inline-flex items-center gap-1.5 ${sizeClasses} text-white whitespace-nowrap transition-opacity hover:opacity-90`}
        style={{ background: 'var(--color-sapphire)' }}
      >
        <Send size={variant === 'sidebar' ? 13 : 12} />
        Повідомити про проблему
      </button>
      <ContactDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultCategory="book_issue"
        bookTitle={bookTitle}
      />
    </>
  );
}
