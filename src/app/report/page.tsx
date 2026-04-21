import type { Metadata } from 'next';
import Link from 'next/link';
import ReportButton from '@/components/report/ReportButton';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  title: 'Повідомити про порушення — UkrBooks',
  description:
    'Форма для подачі скарг на контент UkrBooks: порушення авторських прав, неточні метадані, пошкоджені файли, інші проблеми.',
  alternates: { canonical: `${BASE}/report` },
  robots: { index: false, follow: true },
};

export default function ReportPage() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Повідомити про порушення
          </h1>
          <p className="text-white/60">
            Скарги на авторські права, якість контенту, метадані
          </p>
        </div>
      </div>

      <div className="container-site py-10 max-w-2xl">
        <div className="rounded-2xl p-8 space-y-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <p className="text-gray-700 leading-relaxed">
            UkrBooks дотримується законодавства України «Про авторське право і суміжні права»
            та принципів DMCA. Якщо ви виявили порушення або помилку — заповніть форму нижче.
            Ми розглянемо скаргу протягом 48–72 годин.
          </p>

          <div className="pt-2">
            <ReportButton variant="primary" reportType="copyright">
              🚩 Відкрити форму скарги
            </ReportButton>
          </div>

          <div className="pt-4 border-t text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
            <p className="mb-2">Альтернативно — напишіть на:</p>
            <ul className="space-y-1">
              <li>• <strong>dmca@ukrbooks.ink</strong> — для DMCA та claim-запитів</li>
              <li>• <strong>legal@ukrbooks.ink</strong> — для офіційних судових запитів</li>
              <li>• <strong>info@ukrbooks.ink</strong> — загальні питання</li>
            </ul>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/dmca" className="text-sm" style={{ color: 'var(--color-sapphire)' }}>
              Детальна DMCA-політика →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
