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

export async function fetchVastAd(tagUrl: string): Promise<ResolvedVastAd | null> {
  try {
    const mod = await import('@dailymotion/vast-client');
    const { VASTClient, VASTTracker } = mod;
    const client = new VASTClient();
    const resp = (await Promise.race([
      client.get(tagUrl, { withCredentials: false }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), VAST_TIMEOUT_MS)),
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

export function getVastTagUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_ADSTERRA_VAST_URL;
  if (!raw) return null;
  return raw;
}

export function withCachebuster(url: string, cb: number | string): string {
  return url.includes('?') ? `${url}&cb=${cb}` : `${url}?cb=${cb}`;
}
