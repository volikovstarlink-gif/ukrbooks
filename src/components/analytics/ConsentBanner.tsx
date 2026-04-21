'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'ukr-consent-v1';
const CONSENT_EVENT = 'ukr-consent-updated';

type ConsentState = 'granted' | 'denied';

interface Consent {
  analytics: ConsentState;
  ads: ConsentState;
  ts: number;
}

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  applyToGtag(c);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

function applyToGtag(c: Consent) {
  // Google Consent Mode v2
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  const gtag = w.gtag || function (...args: unknown[]) { (w.dataLayer as unknown[]).push(args); };
  w.gtag = gtag;

  gtag('consent', 'update', {
    analytics_storage: c.analytics,
    ad_storage: c.ads,
    ad_user_data: c.ads,
    ad_personalization: c.ads,
  });
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState<boolean>(true);
  const [ads, setAds] = useState<boolean>(true);

  useEffect(() => {
    // Set default denied state immediately on mount (before any read)
    const w = window as typeof window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    const gtag = w.gtag || function (...args: unknown[]) { (w.dataLayer as unknown[]).push(args); };
    w.gtag = gtag;

    const existing = readConsent();
    if (existing) {
      applyToGtag(existing);
      return;
    }

    // First visit: default deny + show banner
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
    setVisible(true);
  }, []);

  function acceptAll() {
    writeConsent({ analytics: 'granted', ads: 'granted', ts: Date.now() });
    setVisible(false);
  }
  function rejectAll() {
    writeConsent({ analytics: 'denied', ads: 'denied', ts: Date.now() });
    setVisible(false);
  }
  function saveChoice() {
    writeConsent({
      analytics: analytics ? 'granted' : 'denied',
      ads: ads ? 'granted' : 'denied',
      ts: Date.now(),
    });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Налаштування конфіденційності"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--color-border)', pointerEvents: 'auto' }}
      >
        <div className="p-4 sm:p-5">
          {!showDetails ? (
            <>
              <p className="text-sm text-gray-800 leading-relaxed">
                Ми використовуємо cookies для базової аналітики (GA4) та показу реклами, щоб
                утримувати проєкт. Ви можете прийняти все, відхилити необов&apos;язкові або
                обрати самостійно. Обовʼязкові cookies (безпека, сесії) працюють завжди.{' '}
                <Link href="/cookies" className="underline" style={{ color: 'var(--color-sapphire)' }}>
                  Деталі
                </Link>
                {' · '}
                <Link href="/privacy" className="underline" style={{ color: 'var(--color-sapphire)' }}>
                  Політика конфіденційності
                </Link>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={acceptAll}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-sapphire)' }}
                >
                  Прийняти все
                </button>
                <button
                  type="button"
                  onClick={rejectAll}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-cream)', color: 'var(--color-ink)', border: '1px solid var(--color-border)' }}
                >
                  Відхилити необовʼязкові
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="px-4 py-2 text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Налаштування
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-800 font-semibold mb-3">Налаштування cookies</p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-cream)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Необхідні</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Безпека, сесії адмінки, rate-limiting. Завжди активні.
                      </div>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
                      Завжди On
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ background: 'var(--color-cream)' }}>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Аналітика</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Google Analytics 4 з Consent Mode — анонімні перегляди сторінок без персональних даних.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ background: 'var(--color-cream)' }}>
                  <input
                    type="checkbox"
                    checked={ads}
                    onChange={(e) => setAds(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Реклама</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Google AdSense, Adsterra, HilltopAds. Без цього реклама показується неперсоналізована.
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveChoice}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-sapphire)' }}
                >
                  Зберегти вибір
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-muted)' }}
                >
                  ← Назад
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
