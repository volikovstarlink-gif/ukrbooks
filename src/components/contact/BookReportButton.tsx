'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import ContactDialog from './ContactDialog';

interface Props {
  bookTitle: string;
}

export default function BookReportButton({ bookTitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Повідомити про проблему з цією книгою"
        aria-label="Повідомити про проблему"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.85)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }}
      >
        <Mail size={12} />
        Повідомити
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
