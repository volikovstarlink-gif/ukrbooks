'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, X, Play, CheckCircle, Loader2 } from 'lucide-react';

const AD_DURATION_SECONDS = 15;
const TOTAL_ADS = 2;
const MONETAG_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE = '230583';
const MONETAG_SCRIPT_ID = 'monetag-multitag';

// Monetag SDK leaves cached push-notification creatives in these
// localStorage keys. Hidden via globals.css, but also purged so the next
// SDK run fetches fresh creative instead of replaying the old one.
const MONETAG_STORAGE_PREFIXES = ['tvlngkspvrk', 'rlxfx73qhe', 'xod3bx0r4cd', 'cebknrp71zt'];
const MONETAG_STORAGE_EXACT = ['generatedGid', 'syncId', 'syncOrigin', 'syncDate', 'cd9i3wmzpc'];

function purgeMonetagCache() {
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

// Phases:
//   intro       — "Почати перегляд" button. Click = ad #1 popunder fires.
//   ad-wait     — countdown while the ad is open in another tab.
//   ad-click-2  — "Переглянути другу рекламу" button. Click = ad #2 popunder.
//   downloading — programmatic <a download>.click() so no extra popunder.
//
// Why no sandboxed iframe: Monetag's Multitag SDK checks the hosting origin
// against the configured zone domain; inside a sandboxed iframe with
// `srcdoc` the origin is opaque so the SDK refuses to serve popunders.
// Instead the SDK is loaded into the book page only when the modal mounts.
// That keeps it off the homepage / catalog / category pages entirely, so
// navigation no longer triggers popunders. The SDK's click listener does
// stay attached to `document` afterwards — but (a) the modal unmounts the
// moment the file starts downloading, (b) users almost always close the
// tab or leave once they have their file. The trade-off is one possible
// extra popunder on a stray post-download click vs. popunders on every
// click sitewide (the previous behaviour).
type Phase = 'intro' | 'ad-wait' | 'ad-click-2' | 'downloading';

interface DownloadGateProps {
  downloadUrl: string;
  fileName: string;
  format: string;
  isOpen: boolean;
  onClose: () => void;
}

function loadMonetag() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MONETAG_SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = MONETAG_SCRIPT_ID;
  s.src = MONETAG_SRC;
  s.async = true;
  s.setAttribute('data-zone', MONETAG_ZONE);
  s.setAttribute('data-cfasync', 'false');
  document.head.appendChild(s);
}

export default function DownloadGate(props: DownloadGateProps) {
  // Re-mount the inner component every time the modal opens so state
  // resets cleanly (avoids the React 19 setState-in-effect lint rule).
  if (!props.isOpen) return null;
  return <DownloadGateInner {...props} />;
}

function DownloadGateInner({
  downloadUrl,
  fileName,
  format,
  onClose,
}: Omit<DownloadGateProps, 'isOpen'>) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [adsWatched, setAdsWatched] = useState(0);
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Load the Monetag SDK on mount so that the very first user click —
  // the "Почати" button below — is already hooked by Multitag and fires
  // a popunder. Purge any stale cached push creative at the same time
  // so the SDK does not replay an old "Поздравляем" overlay.
  useEffect(() => {
    purgeMonetagCache();
    loadMonetag();
  }, []);

  const triggerDownload = useCallback(() => {
    const a = downloadLinkRef.current;
    if (a) {
      a.click();
    } else {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(onClose, 1200);
  }, [downloadUrl, fileName, onClose]);

  // Countdown ticker: when we enter 'ad-wait' the interval drives countdown
  // down to 0, then advances the flow from inside the callback (no
  // cascading setState-in-effect).
  useEffect(() => {
    if (phase !== 'ad-wait') return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) return prev - 1;
        // Countdown done — stop ticking and advance the phase.
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setAdsWatched((watched) => {
          const next = watched + 1;
          if (next >= TOTAL_ADS) {
            setPhase('downloading');
            // Defer the programmatic click until after this render commits
            // so React state reflects the downloading phase first.
            queueMicrotask(triggerDownload);
          } else {
            setPhase('ad-click-2');
          }
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, triggerDownload]);

  // User clicks the intro button → popunder #1 fires via Monetag's auto
  // hook on user-gesture clicks, then start the countdown.
  const handleStart = useCallback(() => {
    setCountdown(AD_DURATION_SECONDS);
    setPhase('ad-wait');
  }, []);

  // User clicks the "watch second ad" button → popunder #2 fires.
  const handleSecondAd = useCallback(() => {
    setCountdown(AD_DURATION_SECONDS);
    setPhase('ad-wait');
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md md:max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          isolation: 'isolate',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <Download size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Завантаження файлу</p>
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

        {/* Body */}
        <div className="px-6 py-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {Array.from({ length: TOTAL_ADS }).map((_, i) => {
              const active =
                (i === adsWatched && (phase === 'ad-wait' || phase === 'ad-click-2')) ||
                (i === 0 && phase === 'intro');
              const done = i < adsWatched && phase !== 'intro';
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
                  {i < TOTAL_ADS - 1 && (
                    <div
                      className="h-0.5 w-12 transition-all duration-300"
                      style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* INTRO phase */}
          {phase === 'intro' && (
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-2">
                Зачекайте 30 секунд ❤️
              </p>
              <p className="text-slate-300 text-base mb-1">
                Подивіться 2 коротких оголошення
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Потім велика зелена кнопка — і книга ваша
              </p>
              <button
                onClick={handleStart}
                className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  minHeight: 52,
                }}
              >
                <Play size={18} fill="white" />
                Почати
              </button>
            </div>
          )}

          {/* AD WAITING phase (countdown) */}
          {phase === 'ad-wait' && (
            <div className="text-center">
              <p className="text-white font-bold text-lg mb-1">
                Оголошення {adsWatched + 1} з {TOTAL_ADS}
              </p>
              <p className="text-slate-400 text-sm mb-5">
                Зачекайте {countdown} сек…
              </p>

              {/* Countdown circle — big, easy to see */}
              <div className="relative w-32 h-32 mx-auto mb-5">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (countdown / AD_DURATION_SECONDS)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-4xl tabular-nums">{countdown}</span>
                </div>
              </div>

              <div
                className="w-full py-4 rounded-xl text-sm flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', minHeight: 52 }}
              >
                <Loader2 size={16} className="animate-spin" />
                Зачекайте ще {countdown} сек…
              </div>
            </div>
          )}

          {/* AD 2 CLICK phase (between ads) */}
          {phase === 'ad-click-2' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
              >
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-xl mb-1">Чудово! 👍</p>
              <p className="text-slate-300 text-base mb-6">
                Ще 1 оголошення — і книга ваша 📖
              </p>
              <button
                onClick={handleSecondAd}
                className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  minHeight: 52,
                }}
              >
                <Play size={18} fill="white" />
                Далі →
              </button>
            </div>
          )}

          {/* DOWNLOADING phase */}
          {phase === 'downloading' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
              >
                <Download size={32} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-2xl mb-1">Готово! 🎉</p>
              <p className="text-slate-300 text-base mb-3">
                Завантаження <strong className="text-white">{format.toUpperCase()}</strong> розпочато
              </p>
              <p className="text-slate-500 text-xs">
                Не завантажилось?{' '}
                <a
                  ref={downloadLinkRef}
                  href={downloadUrl}
                  download={fileName}
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Натисніть сюди
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
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
