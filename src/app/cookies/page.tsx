import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';
const UPDATED_AT = '2026-04-22';

export const metadata: Metadata = {
  title: 'Політика Cookies — UkrBooks',
  description:
    'Які cookies використовує UkrBooks, для чого вони потрібні, як ними керувати.',
  alternates: { canonical: `${BASE}/cookies` },
};

export default function CookiesPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Політика Cookies</h1>
          <p className="text-white/60">Як UkrBooks використовує cookies · Оновлено {UPDATED_AT}</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Що таке cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Cookies — це невеликі текстові файли, що зберігаються у вашому браузері, коли ви
              відвідуєте вебсайт. Вони допомагають сайтам пам&apos;ятати ваші налаштування
              (мову, consent на аналітику), забезпечувати безпеку та збирати анонімну статистику.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Категорії cookies на UkrBooks</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-gray-800 mb-1">1. Необхідні (strictly necessary)</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Без них сайт не працюватиме. Встановлюються без вашої згоди — це дозволено законом.
                </p>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  <li><code className="font-mono">__cf_bm</code> (Cloudflare) — захист від ботів, 30 хв</li>
                  <li><code className="font-mono">cf_clearance</code> (Cloudflare) — верифікація WAF, до 1 року</li>
                  <li><code className="font-mono">admin_session</code> — сесія адміна (тільки для співробітників), 7 днів</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-gray-800 mb-1">2. Аналітичні (potrebu ju згоду)</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Допомагають нам зрозуміти, які сторінки популярні та де виникають помилки. Включаються
                  після вашої згоди у Consent banner.
                </p>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  <li><code className="font-mono">_ga</code>, <code className="font-mono">_ga_*</code> (Google Analytics) — ідентифікатор відвідувача, 2 роки</li>
                  <li>Vercel Speed Insights — без cookies, агрегована статистика CWV</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-gray-800 mb-1">3. Рекламні (потребують згоду)</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Встановлюються рекламними мережами для показу та вимірювання реклами. Керуються через
                  ваш Consent у нас і через Ad Settings на сторінках самих мереж.
                </p>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  <li>Google AdSense — <code className="font-mono">__gads</code>, <code className="font-mono">__gpi</code></li>
                  <li>Adsterra, HilltopAds — власні ідентифікатори зон</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Як керувати cookies</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
              <li>
                <strong>У нас на сайті.</strong> При першому візиті з&apos;являється Consent banner, де
                ви можете прийняти або відхилити аналітичні/рекламні cookies. Передумати — очистіть
                сторінку або cookies браузера, банер покажеться знову.
              </li>
              <li>
                <strong>У браузері.</strong> Усі сучасні браузери дозволяють переглядати, видаляти
                та блокувати cookies: Chrome → Settings → Privacy, Firefox → Settings → Privacy,
                Safari → Preferences → Privacy.
              </li>
              <li>
                <strong>На рівні реклами.</strong> Ви можете відмовитись від персоналізованої реклами
                Google на{' '}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener" style={{ color: 'var(--color-sapphire)' }}>
                  adssettings.google.com
                </a>
                {' '}та для інших мереж — на{' '}
                <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener" style={{ color: 'var(--color-sapphire)' }}>
                  youronlinechoices.eu
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Do Not Track</h2>
            <p className="text-gray-700 leading-relaxed">
              Ми поважаємо сигнал <code className="font-mono">DNT:1</code> у заголовках HTTP —
              аналітичні cookies не встановлюються автоматично, навіть якщо ви прийняли consent.
              Рекламні мережі мають власні політики щодо DNT.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Запитання</h2>
            <p className="text-gray-700 leading-relaxed">
              Якщо ви маєте питання щодо cookies або хочете відкликати згоду — напишіть на{' '}
              <strong>privacy@ukrbooks.ink</strong>. Детальніше про обробку персональних даних — у{' '}
              <Link href="/privacy" style={{ color: 'var(--color-sapphire)' }}>Політиці конфіденційності</Link>.
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
