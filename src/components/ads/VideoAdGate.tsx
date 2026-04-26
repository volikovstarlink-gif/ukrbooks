'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle, Download, Loader2, Play, Volume2, VolumeX, X } from 'lucide-react';
import {
  fetchVastAd,
  fetchVastPodWithFallback,
  getVastTagUrls,
  withCachebuster,
  type ResolvedVastAd,
} from '@/lib/vast';
import {
  trackAdError,
  trackAdGateOpen,
  trackAdImpression,
  trackAdNoFill,
  trackAdQuartile,
  trackDownloadCompleted,
} from '@/lib/ads-analytics';
import HouseAd from './HouseAd';

const AD_POD_SIZE = 2;
const VIGNETTE_DURATION_SEC = 15;

type Phase =
  | 'intro'
  | 'loading'
  | 'playing'
  | 'fallback-wait'
  | 'unlocked'
  | 'downloading';

interface VideoAdGateProps {
  downloadUrl: string;
  fileName: string;
  format: string;
  bookSlug: string;
  isOpen: boolean;
  onClose: () => void;
  /** If provided, the gate calls this instead of triggering a file
   *  download after the ad pod is satisfied. Used by the online
   *  reader flow: parent flips its state and unmounts the gate, so
   *  no "Завантаження розпочато" UI flashes at the end. */
  onComplete?: () => void;
}

export default function VideoAdGate(props: VideoAdGateProps) {
  if (!props.isOpen) return null;
  return <Inner {...props} />;
}

function Inner({
  downloadUrl,
  fileName,
  format,
  bookSlug,
  onClose,
  onComplete,
}: Omit<VideoAdGateProps, 'isOpen'>) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [adIndex, setAdIndex] = useState(0);
  const [currentAd, setCurrentAd] = useState<ResolvedVastAd | null>(null);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [fallbackCountdown, setFallbackCountdown] = useState(VIGNETTE_DURATION_SEC);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const quartilesFiredRef = useRef<Record<string, boolean>>({});
  const adsCompletedRef = useRef(0);
  const currentNetworkRef = useRef<string>('unknown');
  const podRef = useRef<ResolvedVastAd[]>([]);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    trackAdGateOpen(bookSlug, format);
    startTimeRef.current = Date.now();
    return () => {
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [bookSlug, format]);

  const triggerDownload = useCallback(() => {
    // Reader flow: parent handles what "complete" means (e.g. render
    // BookReader). Don't touch files, don't fire download telemetry.
    if (onComplete) {
      onComplete();
      return;
    }

    // R2 serves every book file with Content-Type: application/octet-stream
    // and Content-Disposition: attachment (migration fix-r2-download-headers),
    // so a plain direct link downloads correctly on iOS Safari, Mi Browser,
    // and everything else — no blob round-trip required.
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    trackDownloadCompleted(bookSlug, adsCompletedRef.current, elapsed);
    setPhase('downloading');
    setTimeout(onClose, 1500);
  }, [downloadUrl, fileName, bookSlug, onClose, onComplete]);

  const startFallback = useCallback(
    (index: number) => {
      setPhase('fallback-wait');
      setFallbackCountdown(VIGNETTE_DURATION_SEC);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = setInterval(() => {
        setFallbackCountdown((prev) => {
          if (prev > 1) return prev - 1;
          if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          adsCompletedRef.current += 1;
          if (index + 1 < AD_POD_SIZE) {
            setAdIndex(index + 1);
            void loadAndPlayRef.current(index + 1);
          } else {
            setPhase('unlocked');
            triggerDownload();
          }
          return 0;
        });
      }, 1000);
    },
    [triggerDownload],
  );

  const loadAndPlay = useCallback(
    async (index: number) => {
      setAdIndex(index);
      setPhase('loading');
      quartilesFiredRef.current = {};
      setCurrentAd(null);
      setCanSkip(false);

      const urls = getVastTagUrls();
      if (urls.length === 0) {
        trackAdNoFill('vast_waterfall', 'no_urls_configured');
        startFallback(index);
        return;
      }

      // First slot: ask for a pod (one network round-trip that may include
      // multiple <Ad>s). Cache the result in podRef.
      if (index === 0) {
        podRef.current = [];
        const result = await fetchVastPodWithFallback(urls, AD_POD_SIZE, (label, _i, reason) => {
          trackAdNoFill(label, reason);
        });
        if (!result || result.ads.length === 0) {
          trackAdNoFill('vast_waterfall', 'all_hops_failed');
          startFallback(index);
          return;
        }
        currentNetworkRef.current = result.networkLabel;
        podRef.current = result.ads;
      } else if (!podRef.current[index]) {
        // Slot 2+: HilltopAds usually returns a single <Ad> per VAST response,
        // so the pod is short for this slot. Fire a fresh VAST request with
        // a new cachebuster — the SSP treats it as a distinct impression
        // opportunity and can serve a different creative (otherwise the
        // viewer sees the house fallback here and the ad network sees only
        // one impression per download, hurting fill & revenue).
        const fresh = await fetchVastAd(
          withCachebuster(urls[0], `${Date.now()}_slot${index}`),
        );
        if (fresh) {
          podRef.current[index] = fresh;
        }
      }

      const ad = podRef.current[index];
      if (!ad) {
        trackAdNoFill(currentNetworkRef.current, 'pod_short');
        startFallback(index);
        return;
      }
      setCurrentAd(ad);
      setPhase('playing');
    },
    [startFallback],
  );

  // Ref-wrapper so that startFallback can call loadAndPlay without circular dep
  const loadAndPlayRef = useRef(loadAndPlay);
  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  // When playing phase starts with a new ad, wire the <video> element.
  useEffect(() => {
    if (phase !== 'playing') return;
    const v = videoRef.current;
    const ad = currentAd;
    if (!v || !ad) return;
    v.src = ad.media.url;
    v.muted = muted;
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        trackAdError(currentNetworkRef.current, `play:${String(err)}`);
        startFallback(adIndex);
      });
    }
    // muted/adIndex intentionally NOT in deps — we only want to re-run on
    // phase change or new currentAd instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentAd]);

  const handleStart = useCallback(() => {
    void loadAndPlay(0);
  }, [loadAndPlay]);

  const handleVideoLoadedMetadata = () => {
    const v = videoRef.current;
    const ad = currentAd;
    if (!v || !ad) return;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      ad.tracker.setDuration(v.duration);
      setRemaining(Math.ceil(v.duration));
    }
  };

  const handleVideoPlay = () => {
    const ad = currentAd;
    if (!ad) return;
    if (!ad.tracker.impressed) {
      ad.tracker.trackImpression();
      trackAdImpression(currentNetworkRef.current, adIndex + 1);
    }
  };

  const handleVideoTimeUpdate = () => {
    const v = videoRef.current;
    const ad = currentAd;
    if (!v || !ad || !Number.isFinite(v.duration)) return;
    ad.tracker.setProgress(v.currentTime);
    setRemaining(Math.max(0, Math.ceil(v.duration - v.currentTime)));
    const fired = quartilesFiredRef.current;
    const quartiles: { key: string; at: number }[] = [
      { key: 'first', at: v.duration * 0.25 },
      { key: 'mid', at: v.duration * 0.5 },
      { key: 'third', at: v.duration * 0.75 },
    ];
    for (const q of quartiles) {
      if (!fired[q.key] && v.currentTime >= q.at) {
        fired[q.key] = true;
        trackAdQuartile(q.key, adIndex + 1, currentNetworkRef.current);
      }
    }
    // Skip button unlocks at 15s on every ad. Google Ads policy requires
    // advertiser declaration of "non-skippable video" placements — we
    // declared none, so this path must always be reachable, not gated on
    // an env flag that could silently flip the experience back to
    // non-skippable and put the Ads account at risk.
    if (!canSkip && v.currentTime >= 15) {
      setCanSkip(true);
    }
  };

  const handleVideoEnded = () => {
    const ad = currentAd;
    if (ad) ad.tracker.complete();
    trackAdQuartile('complete', adIndex + 1, currentNetworkRef.current);
    adsCompletedRef.current += 1;
    if (adIndex + 1 < AD_POD_SIZE) {
      void loadAndPlay(adIndex + 1);
    } else {
      setPhase('unlocked');
      triggerDownload();
    }
  };

  const handleVideoError = () => {
    const ad = currentAd;
    if (ad) ad.tracker.error({ ERRORCODE: 405 }, true);
    trackAdError(currentNetworkRef.current, 'media-error');
    startFallback(adIndex);
  };

  const handleSkip = () => {
    if (!canSkip) return;
    const ad = currentAd;
    if (ad?.tracker.skip) {
      try { ad.tracker.skip(); } catch {}
    }
    trackAdQuartile('skip', adIndex + 1, currentNetworkRef.current);
    adsCompletedRef.current += 1;
    if (adIndex + 1 < AD_POD_SIZE) {
      void loadAndPlay(adIndex + 1);
    } else {
      setPhase('unlocked');
      triggerDownload();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    const ad = currentAd;
    if (ad) ad.tracker.setMuted(next);
  };

  // VAST click-through: opens advertiser URL in a new tab and fires
  // <ClickTracking> pings. Without this, HilltopAds treats every impression
  // as fake traffic and balance stays $0 even if play-throughs look fine.
  const handleAdClick = () => {
    const ad = currentAd;
    if (!ad) return;
    const url = ad.clickThroughUrl;
    try { ad.tracker.click?.(url, {}); } catch {}
    if (url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(6px)',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          isolation: 'isolate',
        }}
      >
        <div
          className="px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              {onComplete ? (
                <BookOpen size={20} className="text-blue-400" />
              ) : (
                <Download size={20} className="text-blue-400" />
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                {onComplete ? 'Відкриття книги' : 'Завантаження файлу'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[220px]">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 -mt-1"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 py-4">
          {Array.from({ length: AD_POD_SIZE }).map((_, i) => {
            const done =
              i < adIndex || phase === 'unlocked' || phase === 'downloading' || (i < adsCompletedRef.current);
            const active =
              i === adIndex &&
              phase !== 'intro' &&
              phase !== 'unlocked' &&
              phase !== 'downloading';
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                  style={{
                    background: done
                      ? 'rgba(34,197,94,0.15)'
                      : active
                        ? 'rgba(59,130,246,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    border: done
                      ? '2px solid #22c55e'
                      : active
                        ? '2px solid #3b82f6'
                        : '2px solid rgba(255,255,255,0.1)',
                    color: done ? '#22c55e' : active ? '#3b82f6' : '#64748b',
                  }}
                >
                  {done ? <CheckCircle size={16} /> : i + 1}
                </div>
                {i < AD_POD_SIZE - 1 && (
                  <div
                    className="h-0.5 w-12 transition-all duration-300"
                    style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6">
          {phase === 'intro' && (
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-2">Перегляньте коротке оголошення</p>
              <p className="text-slate-300 text-base mb-1">
                Реклама підтримує безкоштовну бібліотеку
              </p>
              <p className="text-slate-500 text-sm mb-6">
                {onComplete ? 'Після цього почнеться читання 📖' : 'Після цього книга ваша 📖'}
              </p>
              <button
                onClick={handleStart}
                className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  minHeight: 52,
                }}
              >
                <Play size={18} fill="white" /> Почати
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-3 text-blue-400" size={32} />
              <p className="text-slate-300 text-sm">
                Завантаження оголошення {adIndex + 1} з {AD_POD_SIZE}…
              </p>
            </div>
          )}

          {phase === 'playing' && (
            <div>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-3">
                <video
                  key={`ad-${adIndex}`}
                  ref={videoRef}
                  className="w-full h-full"
                  playsInline
                  autoPlay
                  onPlay={handleVideoPlay}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                />
                {/* Click-through layer — clicking the ad opens the advertiser
                    URL in a new tab and fires VAST <ClickTracking> pings.
                    Required by HilltopAds: without real clicks the SSP marks
                    traffic as fake and pays $0. Controls above get zIndex:2
                    so Mute/Skip/badge still win over this layer. */}
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
                    cursor: currentAd?.clickThroughUrl ? 'pointer' : 'default',
                  }}
                />
                <button
                  onClick={toggleMute}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                  style={{ zIndex: 2 }}
                  aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                {canSkip && (
                  <button
                    onClick={handleSkip}
                    className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-medium"
                    style={{ zIndex: 2 }}
                  >
                    Пропустити →
                  </button>
                )}
                <div
                  className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium"
                  style={{ zIndex: 2 }}
                >
                  Оголошення {adIndex + 1} / {AD_POD_SIZE} · {remaining}с
                </div>
              </div>
              <p className="text-slate-400 text-xs text-center">
                Будь ласка, дочекайтеся завершення реклами
              </p>
            </div>
          )}

          {phase === 'fallback-wait' && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 44 * (fallbackCountdown / VIGNETTE_DURATION_SEC)
                      }`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl tabular-nums">
                      {fallbackCountdown}
                    </span>
                  </div>
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-sm leading-tight">
                    Оголошення {adIndex + 1} з {AD_POD_SIZE}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">Зачекайте кілька секунд</p>
                </div>
              </div>
              <HouseAd cycleIndex={adIndex} />
            </div>
          )}

          {(phase === 'unlocked' || phase === 'downloading') && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
              >
                <Download size={32} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-2xl mb-1">Готово! 🎉</p>
              <p className="text-slate-300 text-base mb-3">
                Завантаження <strong className="text-white">{format.toUpperCase()}</strong>{' '}
                розпочато
              </p>
              <p className="text-slate-500 text-xs">
                Не завантажилось?{' '}
                <button
                  type="button"
                  onClick={() => triggerDownload()}
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Натисніть сюди
                </button>
              </p>
            </div>
          )}
        </div>

        <div
          className="px-6 pb-4 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-slate-600 text-xs pt-4">
            Реклама підтримує безкоштовний доступ до бібліотеки 📚
          </p>
        </div>
      </div>
    </div>
  );
}
