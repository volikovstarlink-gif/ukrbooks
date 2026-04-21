import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const UPDATED_AT = '2026-04-22';

export const metadata: Metadata = {
  title: 'Умови використання — UkrBooks',
  description:
    'Правила та умови користування сайтом UkrBooks: дозволене використання, обмеження, відповідальність, процедура вирішення спорів.',
  alternates: { canonical: `${BASE}/terms` },
};

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Умови використання</h1>
          <p className="text-white/60">Правила користування UkrBooks · Оновлено {UPDATED_AT}</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Загальні положення</h2>
            <p className="text-gray-700 leading-relaxed">
              Ці Умови регулюють користування онлайн-каталогом UkrBooks (далі — Сайт), розміщеним за
              адресою {BASE}. Користуючись Сайтом, ви погоджуєтеся з цими Умовами. Якщо ви не згодні
              з будь-яким положенням — припиніть користуватися Сайтом.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Характер сервісу</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Сайт надає безкоштовний доступ до:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Метаданих книг (назва, автор, опис, обкладинка, рік публікації)</li>
              <li>Електронних копій творів, які перебувають у суспільному надбанні (публічний домен)</li>
              <li>Творів, розміщених з дозволу правовласників або під відкритими ліцензіями (Creative Commons)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Сайт не є комерційним книжковим магазином. Ми не продаємо книги і не укладаємо
              ліцензійних угод з користувачами щодо електронних копій.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Дозволене використання</h2>
            <p className="text-gray-700 leading-relaxed">
              Ви маєте право завантажувати та читати книги з Сайту для особистого некомерційного використання.
              Перепублікація, копіювання у комерційних цілях, масове завантаження через автоматизовані засоби,
              а також дії, що порушують права авторів або чинне законодавство — заборонені.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Обмеження</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Заборонено використовувати скрейпери, ботів, парсери для масового копіювання каталогу</li>
              <li>Заборонено створювати похідні сервіси шляхом перепакування контенту Сайту</li>
              <li>Заборонено обходити технічні обмеження (rate limits, captcha, рекламні gateways)</li>
              <li>Заборонено використовувати Сайт для поширення шкідливого програмного забезпечення</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Порушення правил веде до блокування IP-адреси та, за необхідності, звернення до правоохоронних органів.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Авторські права</h2>
            <p className="text-gray-700 leading-relaxed">
              Ми поважаємо авторські права та реагуємо на обґрунтовані скарги правовласників протягом
              48–72 годин. Детальна процедура описана на сторінці{' '}
              <Link href="/dmca" style={{ color: 'var(--color-sapphire)' }}>Авторські права (DMCA)</Link>.
              Якщо ви є автором або правовласником і бачите свій твір на Сайті — напишіть на{' '}
              <strong>dmca@ukrbooks.ink</strong>, ми оперативно розглянемо запит.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Реклама та аналітика</h2>
            <p className="text-gray-700 leading-relaxed">
              Сайт утримується за рахунок реклами від третіх осіб (Google AdSense, Adsterra, HilltopAds).
              Частина завантажень потребує перегляду коротких рекламних роликів. Базова аналітика
              (Google Analytics 4 з Consent Mode v2) використовується для розуміння навантаження та
              інтересів читачів — без пов&apos;язування з вашою особистістю. Детальніше — у{' '}
              <Link href="/privacy" style={{ color: 'var(--color-sapphire)' }}>Політиці конфіденційності</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Відмова від гарантій</h2>
            <p className="text-gray-700 leading-relaxed">
              Сайт надається «як є» (as is) без явних чи неявних гарантій. Ми не гарантуємо безперервну
              доступність, відсутність помилок у файлах чи метаданих, стовідсоткову точність опису книг.
              Ми не несемо відповідальності за збитки, що виникли внаслідок користування або неможливості
              користування Сайтом.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Зміни</h2>
            <p className="text-gray-700 leading-relaxed">
              Ми залишаємо за собою право оновлювати ці Умови. Поточна версія завжди доступна за цією
              адресою з датою оновлення нагорі сторінки. Суттєві зміни будуть анонсовані на головній
              сторінці Сайту не менш ніж за 30 днів до набуття чинності.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Юрисдикція</h2>
            <p className="text-gray-700 leading-relaxed">
              Ці Умови регулюються законодавством України. Спори, що виникають у зв&apos;язку з Сайтом,
              підлягають розгляду у судах України. Для DMCA-запитів ми також дотримуємось відповідних
              норм 17 U.S.C. § 512.
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
