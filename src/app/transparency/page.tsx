import type { Metadata } from 'next';
import Link from 'next/link';
import { getRedis, getRecent } from '@/lib/redis';
import HilltopBanner from '@/components/ads/HilltopBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Transparency Report — UkrBooks',
  description:
    'Щоквартальний звіт UkrBooks: кількість скарг, типи, рівень вирішення. Відкриті дані без персональної інформації.',
  alternates: { canonical: `${BASE}/transparency` },
};

export const revalidate = 3600;

const TYPE_LABELS: Record<string, { ua: string; en: string }> = {
  copyright: { ua: 'Авторські права', en: 'Copyright' },
  incorrect_metadata: { ua: 'Метадані', en: 'Metadata' },
  broken_file: { ua: 'Файл', en: 'Broken file' },
  bad_quality: { ua: 'Якість', en: 'Quality' },
  other: { ua: 'Інше', en: 'Other' },
};

interface Report {
  caseId: string;
  type: string;
  ts: number;
}

async function loadStats() {
  const r = getRedis();
  if (!r) return null;

  const queue = (await getRecent('reports:queue', 500)) as unknown as Report[];
  const caseIds = queue.map((q) => q.caseId).filter(Boolean);
  const statuses = caseIds.length > 0
    ? await r.mget<(string | null)[]>(...caseIds.map((id) => `report:${id}:status`))
    : [];

  const cut30 = Date.now() - 30 * 86400 * 1000;
  const cut90 = Date.now() - 90 * 86400 * 1000;

  const stats = {
    total: queue.length,
    last30: 0,
    last90: 0,
    byType: {} as Record<string, number>,
    last30ByType: {} as Record<string, number>,
    byStatus: { open: 0, resolved: 0, rejected: 0 },
  };

  for (let i = 0; i < queue.length; i++) {
    const rep = queue[i];
    if (!rep || typeof rep.ts !== 'number') continue;
    const status = (statuses?.[i] as 'open' | 'resolved' | 'rejected' | null) || 'open';
    const type = TYPE_LABELS[rep.type] ? rep.type : 'other';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.byStatus[status]++;
    if (rep.ts >= cut30) {
      stats.last30++;
      stats.last30ByType[type] = (stats.last30ByType[type] || 0) + 1;
    }
    if (rep.ts >= cut90) stats.last90++;
  }

  return stats;
}

export default async function TransparencyPage() {
  const stats = await loadStats();

  const reportJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: 'UkrBooks Transparency Report',
    url: `${BASE}/transparency`,
    author: { '@type': 'Organization', name: 'UkrBooks', url: BASE },
    datePublished: new Date().toISOString(),
    inLanguage: 'uk',
    description:
      'Відкритий звіт про кількість та типи скарг, отриманих UkrBooks, включно з рівнем вирішення.',
    about: {
      '@type': 'Thing',
      name: 'Copyright complaints and content moderation at UkrBooks',
    },
  };

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd) }}
      />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Transparency Report</h1>
          <p className="text-white/60">
            Відкриті дані про скарги та модерацію · Оновлюється щогодини
          </p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Навіщо цей звіт</h2>
            <p className="text-gray-700 leading-relaxed">
              Ми публікуємо агреговані дані про кількість і типи скарг, які отримуємо від
              правовласників та користувачів. Мета — показати, що ми серйозно ставимося до
              copyright-запитів і швидко на них реагуємо. Жодна інформація про конкретних
              заявників чи книги тут не розкривається.
            </p>
          </section>

          {!stats ? (
            <section className="rounded-xl p-6 text-center" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <p className="text-gray-600">
                Звіт генерується. Статистика з&apos;явиться після першого циклу оновлення.
              </p>
            </section>
          ) : stats.total === 0 ? (
            <section className="rounded-xl p-6 text-center" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <p className="text-gray-700 mb-2">
                <strong>За весь період — 0 скарг.</strong>
              </p>
              <p className="text-sm text-gray-600">
                Ми публікуємо статистику з моменту запуску форми звернень (квітень 2026).
              </p>
            </section>
          ) : (
            <>
              {/* Overview cards */}
              <section>
                <h2 className="font-display text-xl font-semibold mb-4">Загальні показники</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card label="Останні 30 днів" value={stats.last30} />
                  <Card label="Останні 90 днів" value={stats.last90} />
                  <Card label="Усього в актуальній черзі" value={stats.total} />
                </div>
              </section>

              {/* By type */}
              <section>
                <h2 className="font-display text-xl font-semibold mb-4">За типом звернення</h2>
                <div className="space-y-2">
                  {Object.entries(TYPE_LABELS).map(([key, labels]) => {
                    const count = stats.byType[key] || 0;
                    const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">
                            {labels.ua} <span className="text-gray-400">· {labels.en}</span>
                          </span>
                          <span className="font-semibold text-gray-800">
                            {count} <span className="text-xs text-gray-500">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-cream)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ background: 'var(--color-sapphire)', width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* By status */}
              <section>
                <h2 className="font-display text-xl font-semibold mb-4">За статусом</h2>
                <div className="grid grid-cols-3 gap-3">
                  <Card label="Вирішені" value={stats.byStatus.resolved} highlight="ok" />
                  <Card label="Відхилені" value={stats.byStatus.rejected} />
                  <Card label="Відкриті" value={stats.byStatus.open} highlight="warn" />
                </div>
                {stats.total > 0 && (
                  <p className="text-sm mt-3" style={{ color: 'var(--color-muted)' }}>
                    Рівень обробки:{' '}
                    <strong>
                      {Math.round(((stats.byStatus.resolved + stats.byStatus.rejected) / stats.total) * 100)}%
                    </strong>{' '}
                    скарг опрацьовано (вирішено або відхилено з обґрунтуванням).
                  </p>
                )}
              </section>
            </>
          )}

          {/* Methodology */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Методологія</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Дані оновлюються автоматично кожну годину</li>
              <li>Відображаються до 500 останніх скарг з активної черги; старші записи агрегуються в архіві</li>
              <li>Для кожної скарги зберігаємо: тип, час подачі, статус обробки</li>
              <li>Дані заявника (ім&apos;я, email, IP) — не публікуються і видаляються через 180 днів</li>
              <li>SLA відповіді: 48–72 години для звичайних скарг, 24 години для термінових</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Подати скаргу</h2>
            <p className="text-gray-700 leading-relaxed">
              Правовласники: <Link href="/dmca" style={{ color: 'var(--color-sapphire)' }}>процедура DMCA</Link>.
              Загальні скарги: <Link href="/report" style={{ color: 'var(--color-sapphire)' }}>форма звернення</Link>.
              Судові запити: <strong>legal@ukrbooks.ink</strong>.
            </p>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              ← На головну
            </Link>
          </div>
        </div>
        <HilltopBanner size="300x250" placement="transparency-bottom" />
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: 'ok' | 'warn' }) {
  const color =
    highlight === 'ok' ? '#059669' : highlight === 'warn' ? '#b45309' : 'var(--color-sapphire)';
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
      <div className="text-2xl font-bold" style={{ color }}>
        {value.toLocaleString('uk-UA')}
      </div>
      <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--color-muted)' }}>
        {label}
      </div>
    </div>
  );
}
