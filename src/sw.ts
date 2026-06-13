/// <reference lib="WebWorker" />
/*
 * Custom service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 *  - Precache the app shell for offline launch (Workbox injects the manifest
 *    at the literal `self.__WB_MANIFEST` token below).
 *  - Network-first navigation with offline fallback to the cached shell.
 *  - Receive Web Push and show notifications (works in prod over HTTPS /
 *    installed PWA; the plumbing is identical locally).
 *
 * Kept dependency-free (no Workbox runtime) so the SW stays tiny and legible.
 */
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const CACHE = 'katitos-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  ...self.__WB_MANIFEST.map((entry) => entry.url),
];

// Last-resort offline page when the cached shell itself is gone (iOS purges
// SW caches after ~7 days of non-use) — a visible message beats a dead tab.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Katitos</title><style>html,body{height:100%;margin:0;background:#100408;color:#f3e9ec;font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center}div{text-align:center;padding:2rem}h1{font-weight:600;letter-spacing:.02em}p{opacity:.65;font-size:.9rem}</style></head><body><div><h1>Katitos</h1><p>You're offline. We'll be here when you're back.</p></div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Resilient precache: cache.addAll is atomic, so a single missing asset
      // would abort the whole shell. Cache each entry independently instead —
      // partial precache still launches; never activate with an empty cache.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // App-shell navigation: network-first, fall back to cached index.html, then
  // to a hand-written offline page if even the shell is gone.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match('/index.html');
        return (
          cached ??
          new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        );
      })
    );
    return;
  }

  // Same-origin static assets: cache-first.
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((cached) => cached ?? fetch(req)));
  }
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Katitos', {
      body: payload.body ?? '',
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            void client.focus();
            if ('navigate' in client) void client.navigate(target);
            return;
          }
        }
        return self.clients.openWindow(target);
      })
  );
});

export {};
