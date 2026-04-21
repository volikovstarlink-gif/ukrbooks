export type AdsterraBannerSize = '728x90' | '300x250' | '320x50';

export interface AdsterraBannerConfig {
  key: string | undefined;
  width: number;
  height: number;
}

export function getAdsterraBannerConfig(size: AdsterraBannerSize): AdsterraBannerConfig {
  if (size === '728x90') {
    return {
      key: process.env.NEXT_PUBLIC_ADSTERRA_BANNER_728X90_KEY,
      width: 728,
      height: 90,
    };
  }
  if (size === '300x250') {
    return {
      key: process.env.NEXT_PUBLIC_ADSTERRA_BANNER_300X250_KEY,
      width: 300,
      height: 250,
    };
  }
  return {
    key: process.env.NEXT_PUBLIC_ADSTERRA_BANNER_320X50_KEY,
    width: 320,
    height: 50,
  };
}

/**
 * Build an isolated iframe srcDoc for an Adsterra banner.
 * We isolate each banner in its own iframe because Adsterra's `invoke.js`
 * reads a global `atOptions` variable — two banners on the same page
 * would otherwise clobber each other.
 */
export function buildAdsterraBannerHtml(
  key: string,
  width: number,
  height: number,
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>var atOptions = {"key":"${key}","format":"iframe","height":${height},"width":${width},"params":{}};</script><script src="https://www.highperformanceformat.com/${key}/invoke.js"></script></body></html>`;
}
