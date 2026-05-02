export default function MaintenanceOverlay() {
  return (
    <>
      <style>{`
        html, body {
          overflow: hidden !important;
          height: 100% !important;
          touch-action: none !important;
        }
        body > *:not(.maintenance-overlay) {
          pointer-events: none !important;
          user-select: none !important;
        }
      `}</style>
      <div
        className="maintenance-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483647,
          background:
            'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.25), transparent 55%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontFamily:
            'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: '24px',
            padding: '40px 32px',
            boxShadow:
              '0 30px 60px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04) inset',
            textAlign: 'center',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 24px',
              borderRadius: '20px',
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(236, 72, 153, 0.9))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h1
            id="maintenance-title"
            style={{
              fontFamily:
                'var(--font-playfair), Georgia, "Times New Roman", serif',
              fontSize: '28px',
              lineHeight: 1.25,
              fontWeight: 700,
              margin: '0 0 16px',
              color: '#ffffff',
            }}
          >
            Сайт на технічному оновленні
          </h1>
          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              margin: '0 0 14px',
              color: 'rgba(226, 232, 240, 0.92)',
            }}
          >
            Шановні читачі! Наразі ми проводимо роботи з оновлення сервісу,
            щоб зробити UkrBooks швидшим, зручнішим і кращим для вас.
          </p>
          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              margin: '0 0 14px',
              color: 'rgba(226, 232, 240, 0.92)',
            }}
          >
            Перезапуск бібліотеки заплановано найближчими днями. Ми
            повернемося з оновленим інтерфейсом, новими можливостями та
            ще більшим вибором українських книг.
          </p>
          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              margin: '0 0 28px',
              color: 'rgba(203, 213, 225, 0.85)',
            }}
          >
            Щиро дякуємо за ваше терпіння та довіру. До зустрічі зовсім
            скоро!
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              fontSize: '14px',
              letterSpacing: '0.02em',
              color: '#e0e7ff',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#a5b4fc',
                boxShadow: '0 0 12px rgba(165, 180, 252, 0.9)',
                animation: 'maintenance-pulse 1.6s ease-in-out infinite',
              }}
            />
            Команда UkrBooks
          </div>
        </div>
      </div>
      <style>{`
        @keyframes maintenance-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.85); }
        }
      `}</style>
    </>
  );
}
