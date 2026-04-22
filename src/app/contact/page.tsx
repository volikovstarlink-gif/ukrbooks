import type { Metadata } from 'next';
import Link from 'next/link';
import ContactCategoryList from '@/components/contact/ContactCategoryList';
import HilltopBanner from '@/components/ads/HilltopBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Контакти — UkrBooks',
  description:
    'Зворотний зв\'язок з UkrBooks: форма контакту для загальних питань, DMCA-скарг, судових запитів, конфіденційності.',
  alternates: { canonical: `${BASE}/contact` },
};

export default function ContactPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Контакти</h1>
          <p className="text-white/60">Як зв&apos;язатись з командою UkrBooks</p>
        </div>
      </div>

      <div className="container-site py-10 max-w-3xl">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Категорії звернень</h2>
            <p className="text-sm text-gray-600 mb-4">
              Оберіть категорію — і натисніть «Форма контакту». Ми відповімо на вказаний email.
            </p>
            <ContactCategoryList />
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Час відповіді</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Загальні питання — 2–5 робочих днів</li>
              <li>DMCA-запити — 48–72 години</li>
              <li>Судові запити — відповідно до встановлених законом термінів</li>
              <li>Запити щодо персональних даних — до 30 днів</li>
            </ul>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              ← На головну
            </Link>
          </div>
        </div>
        <HilltopBanner size="300x250" placement="contact-bottom" />
      </div>
    </div>
  );
}
