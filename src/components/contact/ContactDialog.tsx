'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export type ContactCategory = 'general' | 'book_issue' | 'dmca' | 'legal' | 'privacy' | 'ads';

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: 'Загальні питання',
  book_issue: 'Проблема з книгою',
  dmca: 'Авторські права (DMCA)',
  legal: 'Судові запити',
  privacy: 'Конфіденційність',
  ads: 'Реклама',
};

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCategory?: ContactCategory;
  bookTitle?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const FORMSPREE_FORM_ID = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID || '';

export default function ContactDialog({ open, onClose, defaultCategory = 'general', bookTitle }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<ContactCategory>(defaultCategory);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      if (bookTitle && defaultCategory === 'book_issue') {
        setMessage(`Книга: ${bookTitle}\n\nОпишіть проблему: `);
      }
    }
  }, [open, defaultCategory, bookTitle]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStatus('idle');
        setError(null);
        setName('');
        setEmail('');
        setMessage('');
        setWebsite('');
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Вкажіть коректний email');
      return;
    }
    if (message.trim().length < 20) {
      setError('Опишіть ваше звернення детальніше (мінімум 20 символів)');
      return;
    }
    if (website) {
      // honeypot triggered — silently pretend success
      setStatus('success');
      return;
    }
    if (!FORMSPREE_FORM_ID) {
      setError('Форму ще не налаштовано. Спробуйте пізніше або напишіть на info@ukrbooks.ink.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          category: CATEGORY_LABELS[category],
          name: name.trim() || '(не вказано)',
          email: email.trim(),
          message: message.trim(),
          ...(bookTitle ? { book: bookTitle } : {}),
          _subject: bookTitle
            ? `[UkrBooks · ${CATEGORY_LABELS[category]}] ${bookTitle}`
            : `[UkrBooks · ${CATEGORY_LABELS[category]}] ${name.trim() || email.trim()}`,
          _replyto: email.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.errors?.[0]?.message || 'Не вдалося надіслати. Спробуйте пізніше.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setError('Помилка мережі. Спробуйте пізніше.');
      setStatus('error');
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-black/60 rounded-2xl p-0"
      style={{
        background: 'transparent',
        width: 'min(92vw, 32rem)',
        maxHeight: '90vh',
        margin: 'auto',
      }}
    >
      <div className="relative rounded-2xl" style={{ background: '#fff' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--color-muted)' }}
        >
          <X size={18} />
        </button>

        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <h2 className="font-display text-xl font-bold mb-2">Звернення надіслано</h2>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              Дякуємо! Ми відповімо на {email} протягом 2–5 робочих днів.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-sapphire)' }}
            >
              Закрити
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Форма контакту</h2>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Напишіть нам — ми відповімо на вказаний email
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Категорія
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-cream)' }}
                required
              >
                {(Object.keys(CATEGORY_LABELS) as ContactCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Ім&apos;я / організація
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid var(--color-border)' }}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid var(--color-border)' }}
                  required
                  maxLength={200}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Повідомлення <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                style={{ border: '1px solid var(--color-border)', minHeight: '120px' }}
                required
                minLength={20}
                maxLength={3000}
                placeholder="Опишіть ваше звернення (мінімум 20 символів)"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                {message.length}/3000
              </p>
            </div>

            {/* Honeypot */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
            />

            {error && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#991b1b' }}>
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--color-muted)' }}
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'var(--color-sapphire)' }}
              >
                {status === 'submitting' ? 'Надсилаємо…' : 'Надіслати'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
