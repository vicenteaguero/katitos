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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
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

  // App-shell navigation: network-first, fall back to cached index.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/index.html').then((r) => r ?? Response.error())
      )
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
