import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BannerAd from '@/components/ads/BannerAd';

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

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${playfair.variable} ${manrope.variable}`}>
      <head>
        {/* Monetag Multitag — inline in <head> for crawler visibility */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script src="https://quge5.com/88/tag.min.js" data-zone="230583" async data-cfasync="false" />
      </head>
      <body>
        <Header />
        {/* Banner ad under header — visible on all pages */}
        <BannerAd className="py-2" />
        <main>{children}</main>
        <Footer />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{page_path:window.location.pathname});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
