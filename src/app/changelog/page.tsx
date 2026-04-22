import type { Metadata } from 'next';
import Link from 'next/link';
import HilltopBanner from '@/components/ads/HilltopBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Changelog — UkrBooks',
  description:
    'Історія оновлень UkrBooks: нові функції, покращення UX, зміни у політиці авторських прав.',
  alternates: { canonical: `${BASE}/changelog` },
};

interface Entry {
  date: string; // YYYY-MM-DD
  version?: string;
  highlights: string[];
  category: 'feature' | 'improvement' | 'fix' | 'policy' | 'seo';
}

const ENTRIES: Entry[] = [
  {
    date: '2026-04-22',
    category: 'policy',
    highlights: [
      'Запущено Transparency Report із агрегованою статистикою скарг',
      'Додано Consent Mode v2 — згода на cookies перед завантаженням GA4 та реклами',
      'Публічні файли security.txt та humans.txt за стандартом RFC 9116',
      'Кнопка «Повідомити про порушення» на кожній сторінці книги + форма у модалці',
      'Окрема сторінка /report та повна DMCA-процедура з FAQ українською й англійською',
      'Нові правові сторінки: /about, /terms, /privacy, /cookies, /contact',
    ],
  },
  {
    date: '2026-04-22',
    category: 'seo',
    highlights: [
      'Book Schema.org: isAccessibleForFree, license (CC PD mark), usageInfo, copyrightNotice',
      'Organization Schema: email + ContactPoint для customer service та copyright agent',
      'FAQPage schema на /dmca (9 питань з відповідями)',
      'Прибрано «скачати» з keywords — фокус на «читати онлайн/безкоштовно»',
      'Для книг сучасних авторів — noindex у Google (зменшує ризик DMCA-проблем)',
    ],
  },
  {
    date: '2026-04-22',
    category: 'improvement',
    highlights: [
      'Rate-limit на /api/download: 30 запитів/хв + 300/день на IP',
      'Блокування порожнього User-Agent на endpoint завантаження',
      'Заблоковано AI-скрапери: GPTBot, ClaudeBot, PerplexityBot, Bytespider, Applebot-Extended та ін.',
      'Permissions-Policy заголовки: блокування camera/mic/geo/usb/bluetooth',
      'Покращена 404 сторінка з пошуком і популярними категоріями',
    ],
  },
  {
    date: '2026-04-18',
    category: 'feature',
    highlights: [
      'Файли книг перенесено на Cloudflare R2 (нульовий egress, власне сховище)',
      'Custom domain files.ukrbooks.ink для прямих download-посилань',
      'Attachment headers на R2 — fb2 зберігаються як бінарник, а не відкриваються inline',
    ],
  },
  {
    date: '2026-04-16',
    category: 'feature',
    highlights: [
      'Запущено бету rewarded video ads: 2 коротких ролики перед завантаженням',
      'Інтеграція HilltopAds VAST + Adsterra Display банерів',
      'Адмін-панель /admin з реальною аналітикою з Upstash Redis',
    ],
  },
  {
    date: '2026-04-08',
    category: 'feature',
    highlights: [
      'Публічний запуск: Next.js 16 (App Router), React 19, Tailwind CSS 4',
      'Каталог ~2800 книг у форматах EPUB та FB2',
      'Динамічний sitemap.xml + мета-дані для кожної книги',
    ],
  },
];

const CATEGORY_META: Record<Entry['category'], { label: string; color: string; icon: string }> = {
  feature: { label: 'Нова функція', color: 'rgba(37,99,235,0.12)', icon: '✨' },
  improvement: { label: 'Покращення', color: 'rgba(5,150,105,0.12)', icon: '⚡' },
  fix: { label: 'Виправлення', color: 'rgba(234,88,12,0.12)', icon: '🔧' },
  policy: { label: 'Політика', color: 'rgba(147,51,234,0.12)', icon: '⚖️' },
  seo: { label: 'SEO', color: 'rgba(15,23,42,0.08)', icon: '🔎' },
};

export default function ChangelogPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Changelog</h1>
          <p className="text-white/60">Історія оновлень UkrBooks — нові функції, політика, SEO</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="space-y-6">
          {ENTRIES.map((e, i) => {
            const meta = CATEGORY_META[e.category];
            return (
              <article
                key={i}
                className="rounded-2xl p-6"
                style={{ background: '#fff', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{ background: meta.color, color: 'var(--color-ink)' }}
                    >
                      <span>{meta.icon}</span> {meta.label}
                    </span>
                    {e.version && (
                      <code
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: 'var(--color-cream)', color: 'var(--color-muted)' }}
                      >
                        {e.version}
                      </code>
                    )}
                  </div>
                  <time dateTime={e.date} className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    {new Date(e.date + 'T00:00:00Z').toLocaleDateString('uk-UA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm text-gray-700 leading-relaxed">
                  {e.highlights.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Прозорість — це принцип. Для технічних деталей — див.{' '}
            <Link href="/transparency" style={{ color: 'var(--color-sapphire)' }}>
              Transparency Report
            </Link>
            .
          </p>
          <Link href="/" className="text-sm inline-block mt-3" style={{ color: 'var(--color-sapphire)' }}>
            ← На головну
          </Link>
        </div>
        <HilltopBanner size="300x250" placement="changelog-bottom" />
      </div>
    </div>
  );
}
