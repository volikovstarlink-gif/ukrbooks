'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, X, Play, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

const AD_DURATION_SECONDS = 15;
const TOTAL_ADS = 2;
const MONETAG_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE = '230583';
// The iframe's button posts this message tag back to the parent so React can
// confirm the user actually triggered the popunder (real user-gesture click).
const AD_MESSAGE_SOURCE = 'ukrbooks-ad';

type Phase = 'intro' | 'ad' | 'done';

interface DownloadGateProps {
  downloadUrl: string;
  fileName: string;
  format: string;
  isOpen: boolean;
  onClose: () => void;
}

// Self-contained HTML loaded inside a sandboxed <iframe>. The Monetag SDK is
// scoped to this document, so its document-level click handlers cannot leak
// onto the rest of the site. Clicking the button in here is a real user
// gesture inside the iframe — Monetag pops the ad in a new window, and the
// inline onclick posts a message back to the parent to advance React state.
const buildAdFrameDoc = (zone: string, src: string) => `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;padding:0;height:100%;background:transparent;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
  #wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;padding:8px;box-sizing:border-box}
  #ad-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:56px;border:0;border-radius:12px;background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s,transform .1s}
  #ad-btn:hover{opacity:.92}
  #ad-btn:active{transform:scale(.98)}
  #ad-btn[disabled]{cursor:wait;background:rgba(255,255,255,.06);color:#94a3b8}
  #hint{font-size:11px;color:rgba(148,163,184,.85);text-align:center;line-height:1.4}
  .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#94a3b8;margin:0 2px;animation:pulse 1.2s infinite}
  .dot:nth-child(2){animation-delay:.2s}
  .dot:nth-child(3){animation-delay:.4s}
  @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
</style></head><body>
<div id="wrap">
  <button id="ad-btn" disabled>
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span style="margin-left:6px">Завантаження реклами…</span>
  </button>
  <div id="hint">Натисніть кнопку, щоб переглянути рекламу від партнера.</div>
</div>
<script>
  (function(){
    var btn = document.getElementById('ad-btn');
    var ready = false;
    function enable(){
      if (ready) return;
      ready = true;
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Переглянути рекламу';
    }
    var s = document.createElement('script');
    s.src = ${JSON.stringify(src)};
    s.async = true;
    s.setAttribute('data-zone', ${JSON.stringify(zone)});
    s.setAttribute('data-cfasync', 'false');
    s.onload = enable;
    s.onerror = function(){
      // If ads are blocked, still let the user proceed — don't trap them.
      ready = true;
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Продовжити';
      try { parent.postMessage({ source: ${JSON.stringify(AD_MESSAGE_SOURCE)}, type: 'blocked' }, '*'); } catch(e){}
    };
    document.head.appendChild(s);
    // Fallback: enable after 2.5s in case onload never fires.
    setTimeout(enable, 2500);
    btn.addEventListener('click', function(){
      try { parent.postMessage({ source: ${JSON.stringify(AD_MESSAGE_SOURCE)}, type: 'click' }, '*'); } catch(e){}
    });
  })();
</script>
</body></html>`;

export default function DownloadGate(props: DownloadGateProps) {
  // Mount/unmount the inner content with isOpen so state resets naturally
  // each time the modal is opened (avoids setState-in-effect anti-pattern).
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
  const [adClicked, setAdClicked] = useState(false);
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Listen for the iframe button click to start the countdown
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { source?: string; type?: string } | null;
      if (!data || data.source !== AD_MESSAGE_SOURCE) return;
      if (data.type === 'click' || data.type === 'blocked') {
        setAdClicked(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Countdown only runs once the user has clicked the iframe ad button
  useEffect(() => {
    if (phase !== 'ad' || !adClicked) return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, adClicked]);

  const startAd = useCallback(() => {
    setPhase('ad');
    setAdsWatched(0);
    setAdClicked(false);
    setCountdown(AD_DURATION_SECONDS);
  }, []);

  const handleNextAd = useCallback(() => {
    const nextCount = adsWatched + 1;
    setAdsWatched(nextCount);
    if (nextCount >= TOTAL_ADS) {
      setPhase('done');
    } else {
      // Re-mount the iframe to load a fresh ad and reset internal state
      setAdClicked(false);
      setCountdown(AD_DURATION_SECONDS);
    }
  }, [adsWatched]);

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

  const canProceed = adClicked && countdown === 0;

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
            aria-label="Закрити"
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
              <div className="mb-3">
                <p className="text-slate-300 text-sm mb-1">
                  Реклама {adsWatched + 1} з {TOTAL_ADS}
                </p>
                <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                  <ExternalLink size={11} />
                  Реклама відкриється в новій вкладці
                </p>
              </div>

              {/* Sandboxed Monetag iframe — its click hooks live ONLY here */}
              <div
                className="rounded-xl overflow-hidden mb-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <iframe
                  // Re-mount per ad slot so each ad starts fresh
                  key={`ad-${adsWatched}`}
                  title={`Реклама ${adsWatched + 1}`}
                  srcDoc={buildAdFrameDoc(MONETAG_ZONE, MONETAG_SRC)}
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                  style={{ width: '100%', height: '110px', border: 0, display: 'block', background: 'transparent' }}
                />
              </div>

              {/* Countdown / next button */}
              {!adClicked ? (
                <div
                  className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Очікуємо перегляд реклами…
                </div>
              ) : canProceed ? (
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
                  <Loader2 size={14} className="animate-spin" />
                  Зачекайте {countdown} сек…
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
