import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'DMCA — Захист авторських прав',
  description:
    'Повідомлення про порушення авторських прав (DMCA). Якщо ваш контент розміщено без дозволу — зверніться до нас для видалення.',
  alternates: { canonical: `${BASE}/dmca` },
  robots: { index: true, follow: false },
};

export default function DmcaPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
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

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Загальна інформація</h2>
            <p className="text-gray-700 leading-relaxed">
              UkrBooks поважає права інтелектуальної власності та дотримується законодавства
              про авторське право. Ми реагуємо на повідомлення про порушення відповідно до
              Закону України «Про авторське право і суміжні права» та принципів DMCA
              (Digital Millennium Copyright Act).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Якщо ви правовласник</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Якщо ви вважаєте, що ваш твір розміщено на нашому сайті без вашого дозволу,
              надішліть нам повідомлення з наступною інформацією:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Ваше ім&apos;я та контактна інформація (email)</li>
              <li>Назва та автор твору, права на який порушено</li>
              <li>Пряме посилання на сторінку з порушенням на нашому сайті</li>
              <li>Підтвердження того, що ви є правовласником або уповноваженим представником</li>
              <li>Ваш підпис (у тексті email)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Контакт для скарг</h2>
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
              <p className="text-gray-700">
                Надішліть повідомлення на:{' '}
                <strong>dmca@ukrbooks.ink</strong>
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Ми розглядаємо запити протягом 48–72 годин і видаляємо контент у разі
                підтвердженого порушення авторських прав.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Наша політика</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Ми видаляємо спірний контент протягом 48–72 годин після отримання обґрунтованої скарги</li>
              <li>Ми не несемо відповідальності за контент, завантажений без нашого відома</li>
              <li>Бібліотека містить переважно твори, які перебувають у вільному доступі (публічний домен)</li>
              <li>Повторні порушення призводять до постійного видалення контенту</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Публічний домен</h2>
            <p className="text-gray-700 leading-relaxed">
              Більшість творів у нашій бібліотеці є суспільним надбанням (публічний домен) —
              авторські права на них минули. В Україні строк охорони авторських прав становить
              70 років після смерті автора. Твори авторів, які померли до 1955 року,
              як правило, перебувають у публічному домені.
            </p>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              ← Повернутись на головну
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
