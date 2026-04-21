'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export type ReportType = 'copyright' | 'incorrect_metadata' | 'broken_file' | 'bad_quality' | 'other';

const TYPE_LABELS: Record<ReportType, string> = {
  copyright: 'Порушення авторських прав',
  incorrect_metadata: 'Неточні метадані (назва, автор, рік)',
  broken_file: 'Файл пошкоджено / не відкривається',
  bad_quality: 'Погана якість тексту / сканування',
  other: 'Інше',
};

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: ReportType;
  defaultUrl?: string;
  bookTitle?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ReportDialog({ open, onClose, defaultType = 'copyright', defaultUrl, bookTitle }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<ReportType>(defaultType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [confirmRights, setConfirmRights] = useState(false);
  const [confirmTruth, setConfirmTruth] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (open) setType(defaultType);
  }, [open, defaultType]);

  useEffect(() => {
    if (!open) {
      // reset after close
      const t = setTimeout(() => {
        setStatus('idle');
        setError(null);
        setCaseId(null);
        setName('');
        setEmail('');
        setDescription('');
        setConfirmRights(false);
        setConfirmTruth(false);
        setWebsite('');
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const url = defaultUrl || (typeof window !== 'undefined' ? window.location.href : '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Вкажіть коректний email');
      return;
    }
    if (description.trim().length < 30) {
      setError('Опишіть проблему (мінімум 30 символів)');
      return;
    }
    if (type === 'copyright' && (!confirmRights || !confirmTruth)) {
      setError('Для DMCA-скарги потрібно підтвердити обидві заяви');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          url,
          name: name.trim(),
          email: email.trim(),
          description: description.trim(),
          bookTitle: bookTitle || null,
          website, // honeypot — server перевірить що пустий
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Не вдалося надіслати. Спробуйте пізніше.');
        setStatus('error');
        return;
      }
      setCaseId(data.caseId || null);
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
        // click outside the form → close
        if (e.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-black/60 rounded-2xl p-0 w-full max-w-lg"
      style={{ background: 'transparent' }}
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
            <h2 className="font-display text-xl font-bold mb-2">Заявку прийнято</h2>
            {caseId && (
              <p className="text-sm mb-1" style={{ color: 'var(--color-muted)' }}>
                Номер звернення: <code className="font-mono font-semibold">{caseId}</code>
              </p>
            )}
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              Ми розглянемо вашу скаргу протягом 48–72 годин і надішлемо відповідь на
              вказаний email. Копію заявки надіслано на {email}.
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
              <h2 className="font-display text-xl font-bold mb-1">Повідомити про проблему</h2>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Ми реагуємо на обґрунтовані скарги протягом 48–72 годин
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Тип звернення
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-cream)' }}
                required
              >
                {(Object.keys(TYPE_LABELS) as ReportType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Сторінка
              </label>
              <input
                type="url"
                value={url}
                readOnly
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-cream)', color: 'var(--color-muted)' }}
              />
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
                Опис проблеми <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                style={{ border: '1px solid var(--color-border)', minHeight: '90px' }}
                required
                minLength={30}
                maxLength={3000}
                placeholder="Опишіть проблему якомога детальніше (мінімум 30 символів)"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                {description.length}/3000
              </p>
            </div>

            {type === 'copyright' && (
              <div className="space-y-2 p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmRights}
                    onChange={(e) => setConfirmRights(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-gray-700">
                    Я є правовласником або уповноваженим представником правовласника
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmTruth}
                    onChange={(e) => setConfirmTruth(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-gray-700">
                    Заявляю під страхом відповідальності за неправдиве свідчення, що надана
                    інформація достовірна
                  </span>
                </label>
              </div>
            )}

            {/* Honeypot — has to stay empty */}
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
