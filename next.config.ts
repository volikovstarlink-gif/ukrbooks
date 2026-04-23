import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  // Exclude local Books/ trees from serverless function tracing.
  // /api/download reads from BOOKS_DIR only in dev; in prod downloads go
  // direct to R2 via NEXT_PUBLIC_BOOKS_BASE_URL. Without this exclude,
  // Turbopack traces 28k+ book files into the serverless bundle and the
  // function exceeds Vercel's 250MB unzipped size limit.
  outputFileTracingExcludes: {
    '**/*': ['**/Books/**', '**/Books_part2/**', '**/node_modules/@next/swc-*/**'],
    '/api/download/*': ['**/Books/**', '**/Books_part2/**'],
  },

  images: {
    // Covers are pre-converted to WebP at build time by
    // scripts/generate-webp-covers.mjs (resized to 500px, q=82). Vercel's
    // image optimizer would just re-encode them and burn quota for no
    // visible win, so we serve the WebP files directly via Vercel's CDN.
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [200, 300, 400],
    minimumCacheTTL: 86400,
    remotePatterns: [],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  compress: true,
  poweredByHeader: false,

  async redirects() {
    // Old flat-category slugs → new top-level slugs. SEO-indexed URLs
    // preserved via 301; no loss of link equity. Keep in sync with
    // OLD_TO_NEW_CATEGORY in src/lib/books.ts.
    return [
      { source: '/category/ukr-literature', destination: '/category/literature-ukr', permanent: true },
      { source: '/category/fiction', destination: '/category/fantasy', permanent: true },
      { source: '/category/detective', destination: '/category/literature-foreign', permanent: true },
      { source: '/category/romance', destination: '/category/literature-foreign', permanent: true },
      { source: '/category/classic', destination: '/category/classics', permanent: true },
      { source: '/category/business', destination: '/category/business-science', permanent: true },
      { source: '/category/psychology', destination: '/category/self-help', permanent: true },
      { source: '/category/science', destination: '/category/business-science', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/covers/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
      {
        source: '/ads.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        // Matches any /sponsor-*.html shim we add. Neutral name to avoid
        // EasyList / uBlock filter lists that block paths containing
        // "hilltop" or "banner".
        source: '/sponsor-:slug.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, must-revalidate' },
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // SAMEORIGIN (not DENY) lets our own /sponsor-*.html iframe shims
          // load; still blocks cross-origin clickjacking. The previous DENY
          // broke ad banners with net::ERR_BLOCKED_BY_RESPONSE even for
          // same-origin iframes.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Warm DNS for ad networks + R2 + fonts — faster ad fill.
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Block browser APIs we never need. No impact on ads, analytics,
          // or download flow. Keep `browsing-topics` and `interest-cohort`
          // unblocked so AdSense can still read them if user consents.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), serial=(), xr-spatial-tracking=()',
          },
        ],
      },
      {
        // Admin must never be iframed or indexed, even if leaked.
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Next.js optimizer proxies book covers. Allow cross-origin <img>
        // loads so third-party aggregators (e.g. news embeds) can show
        // them with attribution; same-origin is always allowed.
        source: '/_next/image',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

const analyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default analyzer(nextConfig);
