export type HilltopBannerSize = '300x250' | '300x100';

export interface HilltopBannerConfig {
  src: string | undefined;
  width: number;
  height: number;
}

export function getHilltopBannerConfig(size: HilltopBannerSize): HilltopBannerConfig {
  if (size === '300x250') {
    return {
      src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X250_SRC,
      width: 300,
      height: 250,
    };
  }
  return {
    src: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_300X100_SRC,
    width: 300,
    height: 100,
  };
}

/**
 * Build an isolated iframe srcDoc for a HilltopAds Multitag banner. Same
 * iframe-sandbox pattern we use for Adsterra — prevents the vendor SDK
 * from leaking globals into our page (and vice-versa), and limits its
 * access to what sandbox="allow-scripts allow-popups" permits.
 *
 * Hilltop's Multitag banners are served via a single <script src> that
 * renders itself into the current document. Running it inside a sandboxed
 * iframe with a fixed viewport keeps it from stretching our layout.
 */
export function buildHilltopBannerHtml(src: string, width: number, height: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${width}px;height:${height}px}</style></head><body><script async="async" data-cfasync="false" src="${src}"></script></body></html>`;
}
