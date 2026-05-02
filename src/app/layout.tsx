import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MaintenanceOverlay from '@/components/layout/MaintenanceOverlay';
import VisitTracker from '@/components/analytics/VisitTracker';
import ConsentBanner from '@/components/analytics/ConsentBanner';

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

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'UkrBooks — Бібліотека українських книг | EPUB та FB2',
    template: '%s | UkrBooks',
  },
  description:
    'Онлайн-бібліотека українських книг. Тисячі творів у форматах EPUB та FB2. Без реєстрації.',
  keywords: ['українські книги', 'epub', 'fb2', 'електронна бібліотека', 'ukrbooks'],
  authors: [{ name: 'UkrBooks', url: BASE }],
  creator: 'UkrBooks',
  publisher: 'UkrBooks',
  verification: {
    google: '4ccef6440500a52a',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    siteName: 'UkrBooks',
    locale: 'uk_UA',
    type: 'website',
    url: BASE,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ukrbooks',
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${playfair.variable} ${manrope.variable}`}>
      <head>
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* PWA manifest + theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="application-name" content="UkrBooks" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="UkrBooks" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Modern SVG favicon */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        {/* hreflang for Ukrainian */}
        <link rel="alternate" hrefLang="uk" href={BASE} />
        <link rel="alternate" hrefLang="x-default" href={BASE} />
      </head>
      <body>
        {/* Unregister any leftover service worker from the old Monetag push
            integration and clear its caches. Safe to keep for ~60 days after
            Monetag removal so returning users with a cached SW get cleaned up. */}
        <Script id="sw-cleanup" strategy="afterInteractive">
          {`(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){})}if(typeof caches!=='undefined'){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}catch(e){}})();`}
        </Script>
        {/* Anti-adblock canary: /ads.js is a path that EasyList blocks by
            default. If the file loads, window.abc is set; if blocked, we
            report to our analytics. Never gates downloads. */}
        <Script src="/ads.js" strategy="afterInteractive" id="ad-canary" />
        <Script id="ad-canary-check" strategy="afterInteractive">
          {`(function(){setTimeout(function(){var blocked=(typeof window.abc==='undefined');window.__ukrAdBlocked=blocked;if(blocked){try{fetch('/api/track/ad-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'errors',network:'adblock',errorCode:'canary_blocked'}),keepalive:true});}catch(e){}}},1500);})();`}
        </Script>
        <Header />
        <main>{children}</main>
        <Footer />
        <VisitTracker />
        <ConsentBanner />
        <MaintenanceOverlay />
        {/* Consent Mode v2: default-deny BEFORE any ad/analytics script loads.
            ConsentBanner flips to granted based on user choice. Runs even without
            GA_ID because AdSense and other loaders also respect dataLayer consent. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`}
        </Script>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`gtag('js',new Date());gtag('config','${GA_ID}',{page_path:window.location.pathname});`}
            </Script>
          </>
        )}
        {GOOGLE_ADS_ID && (
          <>
            {!GA_ID && (
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
                strategy="afterInteractive"
              />
            )}
            <Script id="google-ads-init" strategy="afterInteractive">
              {`gtag('config','${GOOGLE_ADS_ID}');${
                GOOGLE_ADS_CONVERSION_LABEL
                  ? `gtag('event','conversion',{send_to:'${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}'});`
                  : ''
              }`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
