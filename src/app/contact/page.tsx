import type { Metadata } from 'next';
import Link from 'next/link';
import ReportButton from '@/components/report/ReportButton';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Контакти — UkrBooks',
  description:
    'Зворотний зв\'язок з UkrBooks: email для загальних питань, DMCA-скарг, судових запитів, конфіденційності.',
  alternates: { canonical: `${BASE}/contact` },
};

const CONTACTS: Array<{ email: string; label: string; description: string }> = [
  {
    email: 'info@ukrbooks.ink',
    label: 'Загальні питання',
    description: 'Пропозиції, співпраця, запити від авторів і видавництв, питання про проєкт',
  },
  {
    email: 'dmca@ukrbooks.ink',
    label: 'Авторські права (DMCA)',
    description: 'Скарги правовласників, видалення контенту, counter-notice',
  },
  {
    email: 'legal@ukrbooks.ink',
    label: 'Судові запити',
    description: 'Офіційні запити правоохоронних органів, адвокатські звернення',
  },
  {
    email: 'privacy@ukrbooks.ink',
    label: 'Конфіденційність',
    description: 'Реалізація прав суб\'єкта ПД: доступ, виправлення, видалення даних',
  },
  {
    email: 'ads@ukrbooks.ink',
    label: 'Реклама',
    description: 'Розміщення прямої реклами, партнерські пропозиції',
  },
];

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
            <h2 className="font-display text-xl font-semibold mb-3">Email для різних категорій</h2>
            <div className="space-y-3">
              {CONTACTS.map(({ email, label, description }) => (
                <div key={email} className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800">{label}</div>
                      <p className="text-xs text-gray-600 mt-0.5">{description}</p>
                    </div>
                    <a
                      href={`mailto:${email}`}
                      className="text-sm font-mono whitespace-nowrap"
                      style={{ color: 'var(--color-sapphire)' }}
                    >
                      {email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Форма звернення</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Для швидких звернень (проблеми з сайтом, скарги, пропозиції) використовуйте форму:
            </p>
            <ReportButton variant="primary" reportType="other">
              📨 Відкрити форму звернення
            </ReportButton>
            <p className="mt-3 text-xs" style={{ color: 'var(--color-muted)' }}>
              Для DMCA-скарг краще писати безпосередньо на dmca@ukrbooks.ink або використати
              окрему форму на сторінці{' '}
              <Link href="/dmca" style={{ color: 'var(--color-sapphire)' }}>Авторські права</Link>.
            </p>
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
      </div>
    </div>
  );
}
