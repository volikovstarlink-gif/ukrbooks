export type HilltopBannerSize = '300x250' | '300x100';

export interface HilltopBannerConfig {
  /** Optional URL — for zones that give a clean <script src="..."> tag. */
  src: string | undefined;
  /**
   * Optional base64-encoded inline payload. Kept as an escape hatch, but the
   * preferred way for inline IIFE zones is the static-file mode below — it
   * doesn't bloat env and gives the iframe its own document origin.
   */
  inlineB64: string | undefined;
  /**
   * Path to a static HTML shim in `public/` (e.g. `/hilltop-banner-300x250.html`).
   * This file hosts the vendor's inline `<script>…</script>` block and gets
   * served from our own origin inside a sandboxed iframe. Set to a truthy
   * value when the file exists in public/. Not env-driven because the file
   * itself is tracked in git.
   */
  staticFile: string | undefined;
  width: number;
  height: number;
}

export function getHilltopBannerConfig(size: HilltopBannerSize): HilltopBannerConfig {
  if (size === '300x250') {
    return {
      src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X250_SRC,
      inlineB64: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X250_B64,
      // Neutral filename — adblock filter lists (EasyList/EasyPrivacy/uBlock)
      // block any path containing "hilltop" or "-banner-" before the request
      // even leaves the browser (status: 0, blocked at queue time).
      staticFile: '/sponsor-300x250.html',
      width: 300,
      height: 250,
    };
  }
  return {
    src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X100_SRC,
    inlineB64: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X100_B64,
    staticFile: undefined,
    width: 300,
    height: 100,
  };
}

function decodeB64(b64: string): string {
  if (typeof atob === 'function') return atob(b64);
  // SSR path — Node runtime of Next may hit this during build
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
  return '';
}

/**
 * Build an isolated iframe srcDoc for a HilltopAds Multitag banner. Same
 * iframe-sandbox pattern we use for Adsterra — prevents the vendor SDK
 * from leaking globals into our page (and vice-versa), and limits its
 * access to what sandbox="allow-scripts allow-popups" permits.
 *
 * Two input modes:
 *   1. `{ src }` — plain URL. We inject `<script src="…">`.
 *   2. `{ inlineB64 }` — base64-encoded inline JS/HTML block. We decode and
 *      inject as-is. This is what HilltopAds Multitag Banner zones return.
 */
export function buildHilltopBannerHtml(
  cfg: { src?: string; inlineB64?: string },
  width: number,
  height: number,
): string {
  const head = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${width}px;height:${height}px}</style></head><body>`;
  const tail = `</body></html>`;
  if (cfg.inlineB64) {
    return `${head}${decodeB64(cfg.inlineB64)}${tail}`;
  }
  if (cfg.src) {
    return `${head}<script async="async" data-cfasync="false" src="${cfg.src}"></script>${tail}`;
  }
  return `${head}${tail}`;
}
