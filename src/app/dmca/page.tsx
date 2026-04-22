import type { Metadata } from 'next';
import Link from 'next/link';
import HilltopBanner from '@/components/ads/HilltopBanner';
import ReportButton from '@/components/report/ReportButton';
import { faqPageJsonLd } from '@/lib/jsonld';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'DMCA — Захист авторських прав',
  description:
    'Повідомлення про порушення авторських прав (DMCA). Якщо ваш контент розміщено без дозволу — зверніться до нас для видалення протягом 48–72 годин.',
  alternates: { canonical: `${BASE}/dmca` },
  robots: { index: true, follow: true },
};

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Як повідомити про порушення авторських прав?',
    a: 'Заповніть форму скарги на цій сторінці або надішліть email на dmca@ukrbooks.ink. Вкажіть назву й автора твору, пряме посилання на сторінку з порушенням, ваше ім\'я та контактні дані, підтвердження ваших прав і заяву про достовірність інформації.',
  },
  {
    q: 'Скільки часу розглядається скарга?',
    a: 'Ми розглядаємо обґрунтовані скарги протягом 48–72 годин. У разі підтвердженого порушення — книгу видаляємо з каталогу і надсилаємо підтвердження на вказаний email. Терміновіші випадки (повідомлення від видавництва, судові запити) — пріоритетно протягом 24 годин.',
  },
  {
    q: 'Чому на сайті є твори сучасних авторів?',
    a: 'Бібліотека UkrBooks містить переважно твори у суспільному надбанні (автор помер понад 70 років тому, згідно ст. 28 Закону України «Про авторське право і суміжні права»). Твори сучасних авторів, щодо прав на які у нас немає явного дозволу, ми видаляємо на запит правовласника — так само як це робить Google, Wikipedia чи будь-яка інша платформа.',
  },
  {
    q: 'Чи можна оскаржити видалення книги?',
    a: 'Так. Якщо ваша книга була видалена помилково (наприклад, ви є автором і дозволяли публікацію, або твір у суспільному надбанні), надішліть counter-notice на dmca@ukrbooks.ink з доказами прав. Ми відновимо книгу протягом 10 робочих днів, якщо заявник не подасть судовий позов.',
  },
  {
    q: 'Що таке «суспільне надбання» (публічний домен)?',
    a: 'В Україні твір переходить у суспільне надбання через 70 років після смерті автора (ст. 28 Закону України «Про авторське право»). Твори Тараса Шевченка, Івана Франка, Лесі Українки, Михайла Коцюбинського, Ольги Кобилянської та інших класиків — у публічному домені. Твори перекладачів-класиків також підпадають під це правило, рахуючи від дати смерті перекладача.',
  },
  {
    q: 'Хто стоїть за UkrBooks?',
    a: 'UkrBooks — незалежний некомерційний проєкт українських ентузіастів книжкової культури. Монетизація виключно через рекламу для покриття хостингу. Ми не продаємо контент, не збираємо особисті дані користувачів без їх згоди, і з повагою реагуємо на запити правовласників.',
  },
  {
    q: 'Чи збирається інформація про користувачів?',
    a: 'Ні — ми не вимагаємо реєстрації і не зберігаємо ідентифікаційні дані. Для аналітики використовуємо Google Analytics з Consent Mode. IP-адреси зберігаємо до 60 секунд виключно для захисту від зловживань (rate limiting). Детальніше — у нашій Політиці конфіденційності.',
  },
  {
    q: 'Як довго зберігається інформація про скарги?',
    a: 'Дані скарги (email заявника, опис, URL) зберігаються 180 днів у зашифрованому сховищі. Після цього — видаляються автоматично. Агреговані статистичні дані (кількість скарг за місяць) публікуємо у Transparency Report.',
  },
  {
    q: 'Куди звертатись у випадку судового порядку?',
    a: 'Офіційні запити правоохоронних органів, суду, адвокатів у межах судового провадження надсилайте на legal@ukrbooks.ink. Ми відповідаємо на всі законні запити у визначені законом терміни.',
  },
];

export default function DmcaPage() {
  const faqSchema = faqPageJsonLd(FAQ);

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Захист авторських прав (DMCA)
          </h1>
          <p className="text-white/60">Повідомлення про порушення прав інтелектуальної власності</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>

          {/* Primary CTA */}
          <section className="text-center py-4">
            <p className="text-gray-700 mb-4">
              Якщо ваш твір розміщено на нашому сайті без вашого дозволу, подайте офіційну скаргу — ми
              розглянемо її протягом 48–72 годин.
            </p>
            <ReportButton variant="primary" reportType="copyright">
              🚩 Подати скаргу про порушення
            </ReportButton>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Загальна інформація</h2>
            <p className="text-gray-700 leading-relaxed">
              UkrBooks поважає права інтелектуальної власності та дотримується законодавства
              про авторське право. Ми реагуємо на повідомлення про порушення відповідно до
              Закону України «Про авторське право і суміжні права» та принципів DMCA
              (Digital Millennium Copyright Act, 17 U.S.C. § 512).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Якщо ви правовласник</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Щоб надіслати повідомлення про порушення, скористайтесь формою вище або email. У повідомленні вкажіть:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Ваше ім&apos;я, організацію та контактний email</li>
              <li>Назва та автор твору, права на який порушено</li>
              <li>Пряме посилання на сторінку з порушенням на нашому сайті</li>
              <li>Підтвердження, що ви є правовласником або уповноваженим представником</li>
              <li>Заява про достовірність наданої інформації (під страхом відповідальності за неправдиве свідчення)</li>
              <li>Електронний або фізичний підпис</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Контакт для скарг</h2>
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <p className="text-gray-700">
                Email для DMCA-запитів: <strong>dmca@ukrbooks.ink</strong>
              </p>
              <p className="text-gray-700 mt-1">
                Для судових запитів: <strong>legal@ukrbooks.ink</strong>
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Ми розглядаємо обґрунтовані скарги протягом 48–72 годин і видаляємо контент
                у разі підтвердженого порушення авторських прав.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Наша політика</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Реагуємо на обґрунтовані скарги протягом 48–72 годин</li>
              <li>Видаляємо спірний контент при підтвердженому порушенні авторських прав</li>
              <li>Зберігаємо право на counter-notice (оскарження видалення) для сумлінних видавців</li>
              <li>Повторні порушення призводять до перманентного видалення контенту з усіма варіантами метаданих</li>
              <li>Публікуємо щоквартальний Transparency Report із агрегованою статистикою скарг</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Публічний домен</h2>
            <p className="text-gray-700 leading-relaxed">
              Більшість творів у нашій бібліотеці є суспільним надбанням (публічним доменом) —
              авторські права на них минули. В Україні строк охорони авторських прав становить
              70 років після смерті автора (ст. 28 Закону України «Про авторське право і
              суміжні права»). Твори авторів, які померли до {new Date().getFullYear() - 70} року,
              як правило, перебувають у публічному домені.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Часті питання</h2>
            <div className="space-y-4">
              {FAQ.map(({ q, a }, i) => (
                <details key={i} className="rounded-lg p-4" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
                  <summary className="font-semibold text-gray-800 cursor-pointer">{q}</summary>
                  <p className="mt-3 text-gray-700 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* English summary for international rights-holders */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">DMCA Notice (English)</h2>
            <div className="text-gray-700 text-sm space-y-2 leading-relaxed">
              <p>
                UkrBooks respects intellectual property rights and complies with the Ukrainian
                &quot;Copyright and Related Rights Act&quot; and the principles of the U.S. Digital
                Millennium Copyright Act (17 U.S.C. § 512).
              </p>
              <p>
                To submit a takedown notice, email <strong>dmca@ukrbooks.ink</strong> with:
                (1) identification of the copyrighted work, (2) URL of the infringing material,
                (3) your contact information, (4) a good-faith statement, (5) a statement of accuracy
                under penalty of perjury, (6) an electronic or physical signature. We respond within
                48–72 hours. For counter-notices, use the same address.
              </p>
            </div>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              ← Повернутись на головну
            </Link>
          </div>
        </div>
        <HilltopBanner size="300x250" placement="dmca-bottom" />
      </div>
    </div>
  );
}
