const MONETAG_STORAGE_PREFIXES = ['tvlngkspvrk', 'rlxfx73qhe', 'xod3bx0r4cd', 'cebknrp71zt'];
const MONETAG_STORAGE_EXACT = ['generatedGid', 'syncId', 'syncOrigin', 'syncDate', 'cd9i3wmzpc'];

const DEFAULT_SDK_SRC = 'https://quge5.com/88/tag.min.js';
const SCRIPT_ID = 'monetag-multitag';

export function purgeMonetagCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        MONETAG_STORAGE_PREFIXES.some((p) => k.startsWith(p)) ||
        MONETAG_STORAGE_EXACT.includes(k)
      ) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Inject the Monetag Multitag SDK once per page. Multitag is site-level:
 * a single script serves popunder + vignette + in-page push based on the
 * rules configured in the Monetag dashboard for that site zone. Returns
 * true if the script was injected (or already present) and the zone is
 * configured; false if no zone env var is set.
 */
export function loadMonetag(): boolean {
  if (typeof document === 'undefined') return false;
  const zone = process.env.NEXT_PUBLIC_MONETAG_MULTITAG_ZONE;
  if (!zone) return false;
  if (document.getElementById(SCRIPT_ID)) return true;
  const src = process.env.NEXT_PUBLIC_MONETAG_SDK_SRC || DEFAULT_SDK_SRC;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.src = src;
  s.async = true;
  s.setAttribute('data-zone', zone);
  s.setAttribute('data-cfasync', 'false');
  document.head.appendChild(s);
  return true;
}

export function hasMonetagZone(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MONETAG_MULTITAG_ZONE);
}

export function detectMonetagBlocked(timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(true);
    const start = Date.now();
    const check = () => {
      const win = window as unknown as Record<string, unknown>;
      const hasSdk = Object.keys(win).some((k) => /^(show_|_tfpm|_mg_)/.test(k));
      if (hasSdk) return resolve(false);
      if (Date.now() - start > timeoutMs) return resolve(true);
      setTimeout(check, 200);
    };
    check();
  });
}
