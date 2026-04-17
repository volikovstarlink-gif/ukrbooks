// Cleanup service worker.
//
// Previous versions of this file loaded a third-party ad-push service
// worker (Monetag, zone 10886948, domain 3nbf4.com) that was silently
// registered on users' browsers by the Multitag SDK that used to live in
// the global <head>. That SDK is gone, but the service worker persists on
// every browser that once visited the site — it will keep showing push
// notifications and handling fetch events until it is explicitly
// unregistered.
//
// This replacement SW takes the same path (/sw.js), so the browser's
// 24-hour update check (and page navigations) will swap the old worker
// for this one. On activation it:
//   1. Skips waiting + claims all clients immediately
//   2. Clears every Cache Storage entry it owns
//   3. Unregisters itself so future visits have no SW at all

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // ignore
      }
      try {
        await self.clients.claim();
      } catch {
        // ignore
      }
      try {
        await self.registration.unregister();
      } catch {
        // ignore
      }
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.navigate(client.url).catch(() => {});
        }
      } catch {
        // ignore
      }
    })()
  );
});

// Explicitly swallow push events so no ad notifications are shown while
// the old worker is still being replaced.
self.addEventListener('push', (event) => {
  event.preventDefault?.();
});

self.addEventListener('notificationclick', (event) => {
  event.preventDefault?.();
});
