const POPUNDER_SCRIPT_ID = 'hilltopads-popunder';

export function loadHilltopPopunder(): boolean {
  if (typeof document === 'undefined') return false;
  const src = process.env.NEXT_PUBLIC_HILLTOPADS_POPUNDER_SRC;
  if (!src) return false;
  if (document.getElementById(POPUNDER_SCRIPT_ID)) return true;
  const s = document.createElement('script');
  s.id = POPUNDER_SCRIPT_ID;
  s.src = src;
  s.async = true;
  s.setAttribute('data-cfasync', 'false');
  document.head.appendChild(s);
  return true;
}

export function hasHilltopPopunder(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_HILLTOPADS_POPUNDER_SRC);
}

export type HilltopBannerSize = '300x250' | '300x100';

export interface HilltopBannerConfig {
  /** Optional URL — for zones that give a clean <script src="..."> tag. */
  src: string | undefined;
  /**
   * Optional base64-encoded inline payload — HilltopAds Multitag Banner
   * zones hand you an inline IIFE `<script>…</script>` block, not a src.
   * Put the whole block (including the <script> tags) in Vercel env as
   * base64: `echo -n '<script>…</script>' | base64`.
   * Builder decodes and injects into an iframe srcDoc.
   */
  inlineB64: string | undefined;
  width: number;
  height: number;
}

export function getHilltopBannerConfig(size: HilltopBannerSize): HilltopBannerConfig {
  if (size === '300x250') {
    return {
      src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X250_SRC,
      inlineB64: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X250_B64,
      width: 300,
      height: 250,
    };
  }
  return {
    src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X100_SRC,
    inlineB64: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X100_B64,
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
