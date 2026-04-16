'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, X, Play, CheckCircle, Loader2 } from 'lucide-react';

// Monetag OnClick (Popunder) zone — fires automatically on page click
// The Multitag script (zone 230583) handles popunders on every click
const POPUNDER_ZONE = process.env.NEXT_PUBLIC_MONETAG_POPUNDER_ZONE || '10886945';

const AD_DURATION_SECONDS = 15;
const TOTAL_ADS = 2;

type Phase = 'intro' | 'ad' | 'done';

interface DownloadGateProps {
  downloadUrl: string;
  fileName: string;
  format: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadGate({
  downloadUrl,
  fileName,
  format,
  isOpen,
  onClose,
}: DownloadGateProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [adsWatched, setAdsWatched] = useState(0);
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS);
  const [canProceed, setCanProceed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      setAdsWatched(0);
      setCountdown(AD_DURATION_SECONDS);
      setCanProceed(false);
    }
  }, [isOpen]);

  // Countdown ticker
  useEffect(() => {
    if (phase !== 'ad') return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [phase, adsWatched]);

  // Inject Monetag popunder script to fire ad on next user interaction
  const fireAd = useCallback(() => {
    const s = document.createElement('script');
    s.src = 'https://quge5.com/88/tag.min.js';
    s.async = true;
    s.setAttribute('data-zone', POPUNDER_ZONE);
    s.setAttribute('data-cfasync', 'false');
    document.head.appendChild(s);
  }, []);

  const startAd = useCallback(() => {
    setPhase('ad');
    setCountdown(AD_DURATION_SECONDS);
    setCanProceed(false);
    fireAd();
  }, [fireAd]);

  const handleNextAd = useCallback(() => {
    const nextCount = adsWatched + 1;
    setAdsWatched(nextCount);
    if (nextCount >= TOTAL_ADS) {
      setPhase('done');
    } else {
      setCountdown(AD_DURATION_SECONDS);
      setCanProceed(false);
      fireAd();
    }
  }, [adsWatched, fireAd]);

  const triggerDownload = useCallback(() => {
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    } else {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    onClose();
  }, [downloadUrl, fileName, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
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
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {Array.from({ length: TOTAL_ADS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                  style={{
                    background: i < adsWatched
                      ? 'rgba(34,197,94,0.15)'
                      : i === adsWatched && phase === 'ad'
                        ? 'rgba(59,130,246,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    border: i < adsWatched
                      ? '2px solid #22c55e'
                      : i === adsWatched && phase === 'ad'
                        ? '2px solid #3b82f6'
                        : '2px solid rgba(255,255,255,0.1)',
                    color: i < adsWatched ? '#22c55e' : i === adsWatched && phase === 'ad' ? '#3b82f6' : '#64748b',
                  }}
                >
                  {i < adsWatched ? <CheckCircle size={16} /> : i + 1}
                </div>
                {i < TOTAL_ADS - 1 && (
                  <div
                    className="h-0.5 w-12 transition-all duration-300"
                    style={{ background: i < adsWatched ? '#22c55e' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* INTRO phase */}
          {phase === 'intro' && (
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-2">
                Для безкоштовного завантаження
              </p>
              <p className="text-slate-400 text-sm mb-1">
                перегляньте {TOTAL_ADS} коротких рекламних ролика
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Це займе лише 30 секунд — дякуємо за підтримку бібліотеки!
              </p>
              <button
                onClick={startAd}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
              >
                <Play size={16} fill="white" />
                Почати перегляд
              </button>
            </div>
          )}

          {/* AD phase */}
          {phase === 'ad' && (
            <div className="text-center">
              <div className="mb-4">
                <p className="text-slate-300 text-sm mb-1">
                  Реклама {adsWatched + 1} з {TOTAL_ADS}
                </p>
                <p className="text-slate-500 text-xs">
                  Почекайте поки відлік завершиться
                </p>
              </div>

              {/* Countdown circle */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke={canProceed ? '#22c55e' : '#3b82f6'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={
                      canProceed
                        ? 0
                        : `${2 * Math.PI * 44 * (countdown / AD_DURATION_SECONDS)}`
                    }
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {canProceed ? (
                    <CheckCircle size={32} className="text-green-400" />
                  ) : (
                    <span className="text-white font-bold text-xl">{countdown}</span>
                  )}
                </div>
              </div>

              {canProceed ? (
                <button
                  onClick={handleNextAd}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                >
                  <CheckCircle size={16} />
                  {adsWatched + 1 < TOTAL_ADS ? 'Далі → Ролик 2' : 'Завершити перегляд'}
                </button>
              ) : (
                <div
                  className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  Зачекайте {countdown} сек...
                </div>
              )}
            </div>
          )}

          {/* DONE phase */}
          {phase === 'done' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
              >
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <p className="text-white font-semibold text-lg mb-1">Дякуємо!</p>
              <p className="text-slate-400 text-sm mb-5">
                Натисніть кнопку нижче, щоб завантажити файл
              </p>
              {/* Hidden link used for download */}
              <a ref={downloadLinkRef} href={downloadUrl} download={fileName} className="hidden" />
              <button
                onClick={triggerDownload}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                <Download size={16} />
                Завантажити {format.toUpperCase()}
              </button>
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
