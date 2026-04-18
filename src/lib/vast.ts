export interface VastMediaFile {
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ResolvedVastAd {
  media: VastMediaFile;
  duration: number;
  tracker: VastTrackerLike;
}

// Minimal subset of the @dailymotion/vast-client tracker surface that we use.
// Imported dynamically to keep the library out of the initial bundle.
export interface VastTrackerLike {
  impressed: boolean;
  trackImpression(): void;
  setDuration(duration: number): void;
  setProgress(seconds: number): void;
  setMuted(muted: boolean): void;
  complete(): void;
  error(macros?: Record<string, string | number>, custom?: boolean): void;
  skip?(): void;
}

const VAST_TIMEOUT_MS = 8000;
const VAST_HOP_TIMEOUT_MS = 4000;

export interface WaterfallResult {
  ad: ResolvedVastAd;
  networkLabel: string;
  hopIndex: number;
}

const WATERFALL_LABELS = ['hilltopads'];

interface RawMediaFile {
  fileURL?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

interface RawCreative {
  type?: string;
  duration?: number;
  mediaFiles?: RawMediaFile[];
}

interface RawAd {
  creatives?: RawCreative[];
}

interface RawVastResponse {
  ads?: RawAd[];
}

function pickMediaFile(mediaFiles: RawMediaFile[] | undefined): RawMediaFile | null {
  if (!mediaFiles || mediaFiles.length === 0) return null;
  const playable = mediaFiles.filter((m) => {
    const t = (m.mimeType || '').toLowerCase();
    return t === 'video/mp4' || t === 'video/webm' || t === 'video/ogg';
  });
  if (playable.length === 0) return null;
  const mp4 = playable.filter((m) => (m.mimeType || '').toLowerCase() === 'video/mp4');
  const pool = mp4.length > 0 ? mp4 : playable;
  pool.sort((a, b) => {
    const aDist = Math.abs((a.width || 0) - 640);
    const bDist = Math.abs((b.width || 0) - 640);
    if (aDist !== bDist) return aDist - bDist;
    return (a.bitrate || 0) - (b.bitrate || 0);
  });
  return pool[0];
}

export async function fetchVastAd(
  tagUrl: string,
  timeoutMs: number = VAST_TIMEOUT_MS,
): Promise<ResolvedVastAd | null> {
  try {
    const mod = await import('@dailymotion/vast-client');
    const { VASTClient, VASTTracker } = mod;
    const client = new VASTClient();
    const resp = (await Promise.race([
      client.get(tagUrl, { withCredentials: false }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])) as RawVastResponse | null;
    if (!resp || !resp.ads || resp.ads.length === 0) return null;
    for (const ad of resp.ads) {
      for (const creative of ad.creatives || []) {
        if (creative.type !== 'linear') continue;
        const media = pickMediaFile(creative.mediaFiles);
        if (!media || !media.fileURL) continue;
        const tracker = new VASTTracker(
          client as unknown as ConstructorParameters<typeof VASTTracker>[0],
          ad as unknown as ConstructorParameters<typeof VASTTracker>[1],
          creative as unknown as ConstructorParameters<typeof VASTTracker>[2],
        );
        return {
          media: {
            url: media.fileURL,
            mimeType: media.mimeType || 'video/mp4',
            width: media.width || 0,
            height: media.height || 0,
          },
          duration: creative.duration || 0,
          tracker: tracker as unknown as VastTrackerLike,
        };
      }
    }
    return null;
  } catch (err) {
    if (typeof console !== 'undefined') console.warn('[vast] fetch failed:', err);
    return null;
  }
}

export function getVastTagUrls(): string[] {
  // Adsterra confirmed (via Intercom) they don't support VAST — we keep
  // them for banners+popunder only. HilltopAds is our sole VAST SSP now.
  return [process.env.NEXT_PUBLIC_HILLTOPADS_VAST_URL].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0,
  );
}

export function getVastTagUrl(): string | null {
  return getVastTagUrls()[0] ?? null;
}

export function withCachebuster(url: string, cb: number | string): string {
  return url.includes('?') ? `${url}&cb=${cb}` : `${url}?cb=${cb}`;
}

/**
 * Sequential VAST waterfall across configured SSPs. Each hop uses a short
 * per-hop timeout so the worst-case wait stays bounded. Returns the first
 * successful ad along with the network label for tracking, or null if every
 * hop returned no-fill/timeout.
 */
export async function fetchVastAdWithFallback(
  tagUrls: string[],
  onHopFail?: (networkLabel: string, hopIndex: number, reason: string) => void,
): Promise<WaterfallResult | null> {
  for (let i = 0; i < tagUrls.length; i++) {
    const label = WATERFALL_LABELS[i] ?? `ssp_${i}`;
    const ad = await fetchVastAd(
      withCachebuster(tagUrls[i], `${Date.now()}_${i}`),
      VAST_HOP_TIMEOUT_MS,
    );
    if (ad) return { ad, networkLabel: label, hopIndex: i };
    onHopFail?.(label, i, 'no_fill_or_timeout');
  }
  return null;
}
