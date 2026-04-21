import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Про проєкт — UkrBooks',
  description:
    'UkrBooks — український онлайн-каталог електронних книг. Розповідаємо про місію, принципи, правила та людей за проєктом.',
  alternates: { canonical: `${BASE}/about` },
};

export default function AboutPage() {
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: `${BASE}/about`,
    name: 'Про UkrBooks',
    description: 'Про український онлайн-каталог електронних книг UkrBooks.',
  };

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Про проєкт</h1>
          <p className="text-white/60">Хто, навіщо та як стоїть за UkrBooks</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Місія</h2>
            <p className="text-gray-700 leading-relaxed">
              UkrBooks — онлайн-каталог української електронної літератури: класика, сучасна проза,
              фантастика, поезія, дитячі книги. Ми поєднуємо твори суспільного надбання з книгами,
              щодо яких маємо прямий дозвіл або ліцензію правовласників, і робимо їх зручно доступними
              у відкритих форматах EPUB і FB2 — без реєстрації, без прихованих платежів, з повагою
              до читача й автора.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Принципи</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>
                <strong>Legal-first.</strong> Публікуємо передусім твори у суспільному надбанні
                (автор помер понад 70 років тому, згідно ст. 28 Закону України «Про авторське право»).
                Для сучасних авторів — тільки за наявності дозволу або відкритої ліцензії (CC, Creative Commons).
              </li>
              <li>
                <strong>Повага до правовласників.</strong> Маємо публічну DMCA-процедуру з SLA
                48–72 години. Реагуємо на обґрунтовані скарги й видаляємо спірний контент без зволікань.
              </li>
              <li>
                <strong>Без трекінгу.</strong> Не вимагаємо реєстрації, не зберігаємо персональних даних,
                не продаємо інформацію. Базова аналітика (GA4 з Consent Mode) — для розуміння що цікаво
                читачам, і тільки з вашої згоди.
              </li>
              <li>
                <strong>Відкриті формати.</strong> EPUB і FB2 — щоб книгу можна було читати будь-де:
                у браузері, на читачі, на смартфоні. Жодного DRM.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Як це фінансується</h2>
            <p className="text-gray-700 leading-relaxed">
              UkrBooks — некомерційний проєкт. Витрати на хостинг, домен і зберігання файлів покриваються
              через нерідку, ненав&apos;язливу рекламу на сторінках каталогу. Ми свідомо відмовилися від
              pop-up, сповіщень і трекерів, які зашкодили б досвіду читача. Якщо хочете підтримати нас
              без реклами — посилання на донат є внизу кожної сторінки.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Як ви можете допомогти</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Повідомте про помилку в метаданих (невірний автор, рік, обкладинка)</li>
              <li>Запропонуйте книгу у суспільному домені, якої в нас немає — через форму скарги з типом «Інше»</li>
              <li>Якщо ви автор і хочете розмістити свій твір у нашій бібліотеці — напишіть на <strong>info@ukrbooks.ink</strong></li>
              <li>Розкажіть про проєкт друзям і у соцмережах</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Контакти</h2>
            <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <p className="mb-2"><strong>info@ukrbooks.ink</strong> — загальні питання, співпраця, авторам</p>
              <p className="mb-2"><strong>dmca@ukrbooks.ink</strong> — скарги правовласників, видалення контенту</p>
              <p className="mb-2"><strong>legal@ukrbooks.ink</strong> — судові запити, офіційні звернення</p>
              <p><strong>privacy@ukrbooks.ink</strong> — питання конфіденційності, видалення даних</p>
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-muted)' }}>
              Для офіційної форми звернення скористайтесь сторінкою{' '}
              <Link href="/contact" style={{ color: 'var(--color-sapphire)' }}>Контакти</Link>.
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
