export function sendBeacon(path: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify(data);
  try {
    if ('sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(path, blob)) return;
    }
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow
  }
}
