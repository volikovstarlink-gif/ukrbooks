import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const UPDATED_AT = '2026-04-22';

export const metadata: Metadata = {
  title: 'Політика конфіденційності — UkrBooks',
  description:
    'Які дані ми збираємо, як обробляємо, скільки зберігаємо, та як ви можете реалізувати свої права суб\'єкта персональних даних.',
  alternates: { canonical: `${BASE}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Політика конфіденційності</h1>
          <p className="text-white/60">Обробка персональних даних · Оновлено {UPDATED_AT}</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Загальне</h2>
            <p className="text-gray-700 leading-relaxed">
              Ця Політика пояснює, які дані збирає UkrBooks ({BASE}), як ми їх використовуємо,
              кому передаємо та скільки зберігаємо. Ми керуємося Законом України «Про захист
              персональних даних», GDPR (для відвідувачів з ЄЕА) та CCPA (для відвідувачів із Каліфорнії).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Які дані збираємо</h2>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">Автоматично (веб-сервер)</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>IP-адреса — зберігається до 60 секунд у кеші для захисту від зловживань (rate limiting)</li>
              <li>User-Agent браузера — для статистики сумісності</li>
              <li>Referer — звідки ви перейшли на Сайт</li>
              <li>Технічні логи запитів — щонайбільше 30 днів, у знеособленому вигляді</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">З вашої згоди (через Consent Mode v2)</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Google Analytics 4: перегляди сторінок, завантаження, агреговані метрики (без PII)</li>
              <li>Vercel Speed Insights: Core Web Vitals (LCP, INP, CLS) з нашого домену</li>
              <li>Рекламні мережі (Google AdSense, Adsterra, HilltopAds) — див. розділ 5</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">Якщо ви подаєте скаргу через форму</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Ваше ім&apos;я / організація (якщо вказано)</li>
              <li>Email для відповіді (обов&apos;язково)</li>
              <li>Опис проблеми та URL сторінки</li>
              <li>IP та User-Agent на момент подачі (для перевірки легітимності)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Чого ми НЕ збираємо</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Ми не вимагаємо реєстрації, паролів, номерів телефонів, платіжних даних</li>
              <li>Не продаємо дані третім особам у маркетингових цілях</li>
              <li>Не створюємо профілі користувачів для поведінкового таргетингу</li>
              <li>Не використовуємо фінгерпринтинг пристроїв</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Скільки зберігаємо</h2>
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="pb-2 pr-3">Дані</th>
                    <th className="pb-2">Термін зберігання</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr><td className="py-1.5 pr-3">IP для rate-limit</td><td>60 секунд</td></tr>
                  <tr><td className="py-1.5 pr-3">Серверні access-логи</td><td>30 днів</td></tr>
                  <tr><td className="py-1.5 pr-3">Агрегована аналітика (GA4)</td><td>14 місяців</td></tr>
                  <tr><td className="py-1.5 pr-3">Денні лічильники завантажень</td><td>90 днів</td></tr>
                  <tr><td className="py-1.5 pr-3">Дані поданих скарг</td><td>180 днів</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Треті сторони</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Ми використовуємо сервіси, які можуть встановлювати свої cookies:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li><strong>Vercel</strong> (хостинг) — технічні cookies для CDN та безпеки</li>
              <li><strong>Cloudflare</strong> (CDN, захист) — cf_clearance, __cf_bm для WAF</li>
              <li><strong>Cloudflare R2</strong> — зберігання файлів книг, без відстеження</li>
              <li><strong>Google Analytics 4</strong> — аналітика (тільки за вашою згодою)</li>
              <li><strong>Google AdSense, Adsterra, HilltopAds</strong> — реклама (з власними політиками)</li>
              <li><strong>Upstash Redis</strong> — коротко-термінові лічильники та rate-limiting</li>
              <li><strong>Resend</strong> — доставка email при поданні скарг</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Ваші права</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Згідно з ЗУ «Про захист ПД» та GDPR ви маєте право:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Знати, які ваші дані ми обробляємо (access)</li>
              <li>Вимагати виправлення неточних даних (rectification)</li>
              <li>Вимагати видалення даних (erasure / right to be forgotten)</li>
              <li>Заперечувати проти обробки (objection)</li>
              <li>Отримати дані у машиночитному форматі (portability)</li>
              <li>Відкликати згоду на обробку (withdraw consent) — через Consent Mode banner</li>
              <li>Скаржитись до Уповноваженого Верховної Ради з прав людини або наглядового органу ЄС</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Для реалізації будь-якого права напишіть на <strong>privacy@ukrbooks.ink</strong>. Відповідаємо протягом 30 днів.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Детальний перелік cookies, що використовуються на Сайті, — у{' '}
              <Link href="/cookies" style={{ color: 'var(--color-sapphire)' }}>Cookie Policy</Link>.
              Налаштувати — через браузерні налаштування або наш consent banner при першому візиті.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Діти</h2>
            <p className="text-gray-700 leading-relaxed">
              Сайт не орієнтований на дітей молодших за 13 років (COPPA) / 16 років (GDPR). Ми свідомо
              не збираємо персональні дані таких осіб. Якщо батьки виявили обробку даних своєї дитини —
              напишіть на <strong>privacy@ukrbooks.ink</strong>, ми видалимо їх негайно.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Зміни</h2>
            <p className="text-gray-700 leading-relaxed">
              Суттєві зміни Політики ми анонсуємо на головній сторінці Сайту не менш ніж за 30 днів.
              Дата останнього оновлення — у заголовку цієї сторінки.
            </p>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              ← На головну
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
