import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import StickyMobileBanner from '@/components/ads/StickyMobileBanner';
import AdsterraPopunder from '@/components/ads/AdsterraPopunder';

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
            integration and clear its caches. Safe: the site does not use a
            service worker of its own. */}
        <Script id="sw-cleanup" strategy="afterInteractive">
          {`(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){})}if(typeof caches!=='undefined'){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}catch(e){}})();`}
        </Script>
        {/* Monetag Multitag occasionally injects an "in-page push" iframe
            as a direct child of <html>. Remove only the known Monetag
            ad-domain iframes at that level; do NOT sweep all iframes,
            because legitimate VAST wrapper iframes from other ad networks
            may also live there and we need those to play. */}
        <Script id="monetag-push-remover" strategy="beforeInteractive">
          {`(function(){try{var MONETAG_HOSTS=/(quge5|jmosl|094kk|auqot|tzegilo|bobapsoabauns|monetag|mg_push|mg-push)/i;var isMonetagIframe=function(el){if(!el||el.tagName!=='IFRAME')return false;var src=el.getAttribute('src')||'';var id=el.id||'';var cls=el.className||'';return MONETAG_HOSTS.test(src)||MONETAG_HOSTS.test(id)||MONETAG_HOSTS.test(cls);};var sweep=function(){var root=document.documentElement;if(!root)return;for(var i=root.children.length-1;i>=0;i--){var el=root.children[i];if(isMonetagIframe(el)){try{el.remove();}catch(e){}}}};sweep();var mo=new MutationObserver(function(muts){for(var j=0;j<muts.length;j++){var m=muts[j];for(var k=0;k<m.addedNodes.length;k++){var n=m.addedNodes[k];if(n&&n.parentElement===document.documentElement&&isMonetagIframe(n)){try{n.remove();}catch(e){}}}}});if(document.documentElement)mo.observe(document.documentElement,{childList:true});}catch(e){}})();`}
        </Script>
        <Header />
        <main>{children}</main>
        <Footer />
        <StickyMobileBanner />
        <AdsterraPopunder />
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
