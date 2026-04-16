import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink'),
  title: {
    default: 'UkrBooks — Безкоштовна бібліотека українських книг',
    template: '%s | UkrBooks',
  },
  description: 'Безкоштовна онлайн-бібліотека. Завантажуйте українські книги у форматах EPUB та FB2.',
  openGraph: {
    siteName: 'UkrBooks',
    locale: 'uk_UA',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${playfair.variable} ${manrope.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
