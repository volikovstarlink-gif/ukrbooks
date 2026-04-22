'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { fetchVastAd, getVastTagUrl, withCachebuster, type ResolvedVastAd } from '@/lib/vast';
import {
  trackAdError,
  trackAdImpression,
  trackAdNoFill,
  trackAdQuartile,
} from '@/lib/ads-analytics';

interface InlineVideoAdProps {
  placement: string;
  /** Rendered when VAST is unavailable (no env, no-fill, or media error). */
  fallback?: ReactNode;
  className?: string;
}

type Phase = 'idle' | 'loading' | 'playing' | 'ended' | 'failed';

/**
 * Inline video ad under book description. Plays a single VAST creative from
 * HilltopAds, muted + autoplay + click-blocked (no redirects, no new tabs).
 * Falls through to the provided banner fallback if the waterfall returns no-fill
 * or env is not configured.
 */
export default function InlineVideoAd({ placement, fallback, className }: InlineVideoAdProps) {
  // Short-circuit when VAST env is not configured. `NEXT_PUBLIC_*` is inlined
  // at build time, so this check is equivalent on server and client — no
  // spinner flash, no layout shift: fallback renders directly.
  if (!getVastTagUrl()) {
    return <>{fallback ?? null}</>;
  }
  return <Player placement={placement} fallback={fallback} className={className} />;
}

function Player({ placement, fallback, className }: InlineVideoAdProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const quartilesFiredRef = useRef<Record<string, boolean>>({});
  // Guard against React re-running the fetch effect when our own setPhase
  // change flows back through deps (and against Strict Mode's double-mount).
  // Once we've started a fetch for this mounted component, never restart.
  const fetchStartedRef = useRef(false);

  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [ad, setAd] = useState<ResolvedVastAd | null>(null);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (inView) return;
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    const url = getVastTagUrl();
    if (!url) {
      setPhase('failed');
      return;
    }
    setPhase('loading');
    let cancelled = false;
    (async () => {
      const resolved = await fetchVastAd(withCachebuster(url, `${Date.now()}_${placement}`));
      if (cancelled) return;
      if (!resolved) {
        trackAdNoFill('hilltopads_inline', 'no_fill');
        setPhase('failed');
        return;
      }
      setAd(resolved);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // placement is stable per mount; intentionally omitted to keep this effect
    // one-shot guarded by fetchStartedRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const v = videoRef.current;
    if (!v || !ad) return;
    v.src = ad.media.url;
    v.muted = muted;
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err: unknown) => {
        trackAdError('hilltopads_inline', `play:${String(err)}`);
        setPhase('failed');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ad]);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v || !ad) return;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      ad.tracker.setDuration(v.duration);
      setRemaining(Math.ceil(v.duration));
    }
  }, [ad]);

  const handlePlay = useCallback(() => {
    if (!ad) return;
    if (!ad.tracker.impressed) {
      ad.tracker.trackImpression();
      trackAdImpression('hilltopads_inline', 1);
    }
  }, [ad]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !ad || !Number.isFinite(v.duration)) return;
    ad.tracker.setProgress(v.currentTime);
    setRemaining(Math.max(0, Math.ceil(v.duration - v.currentTime)));
    const fired = quartilesFiredRef.current;
    const quartiles = [
      { key: 'first', at: v.duration * 0.25 },
      { key: 'mid', at: v.duration * 0.5 },
      { key: 'third', at: v.duration * 0.75 },
    ];
    for (const q of quartiles) {
      if (!fired[q.key] && v.currentTime >= q.at) {
        fired[q.key] = true;
        trackAdQuartile(q.key, 1, 'hilltopads_inline');
      }
    }
  }, [ad]);

  const handleEnded = useCallback(() => {
    if (ad) ad.tracker.complete();
    trackAdQuartile('complete', 1, 'hilltopads_inline');
    setPhase('ended');
  }, [ad]);

  const handleError = useCallback(() => {
    if (ad) ad.tracker.error({ ERRORCODE: 405 }, true);
    trackAdError('hilltopads_inline', 'media-error');
    setPhase('failed');
  }, [ad]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    if (ad) ad.tracker.setMuted(next);
  }, [muted, ad]);

  // VAST click-through: open advertiser URL in a new tab + fire <ClickTracking>
  // pings. HilltopAds requires real clicks — impressions without clicks count
  // as fake traffic and pay $0.
  const handleAdClick = useCallback(() => {
    if (!ad) return;
    const url = ad.clickThroughUrl;
    try { ad.tracker.click?.(url, {}); } catch {}
    if (url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
    }
  }, [ad]);

  // Fallback cases: env empty, no-fill, media error, or ad finished.
  // All of these render the fallback banner (if supplied) — never leave a
  // hole in the layout.
  if (phase === 'failed' || phase === 'ended') {
    return <>{fallback ?? null}</>;
  }

  return (
    <div
      ref={hostRef}
      className={className}
      data-ad-placement={`inline-video-${placement}`}
      style={{
        width: '100%',
        maxWidth: 640,
        margin: '1.25rem auto',
      }}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-black"
        style={{
          aspectRatio: '16 / 9',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {phase === 'playing' && ad && (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'contain', background: '#000' }}
              playsInline
              autoPlay
              muted={muted}
              onPlay={handlePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onError={handleError}
            />
            {/* Click-through layer — opens advertiser URL in a new tab and
                fires VAST <ClickTracking>. HilltopAds pays per click; without
                this the SSP flags the traffic as fake. */}
            <button
              type="button"
              aria-label="Відкрити рекламодавця"
              onClick={handleAdClick}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: ad.clickThroughUrl ? 'pointer' : 'default',
              }}
            />
            <div
              className="absolute top-2 left-2 px-2 py-0.5 rounded text-white text-[11px] font-medium pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.55)', zIndex: 2 }}
            >
              Реклама · {remaining}с
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(0,0,0,0.55)', zIndex: 2 }}
              aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </>
        )}
        {(phase === 'idle' || phase === 'loading') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white/80 animate-spin"
              style={{ opacity: 0.6 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
