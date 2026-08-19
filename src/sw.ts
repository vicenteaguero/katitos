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

const CACHE = 'katitos-shell-v5';
// Photos from Supabase storage (signed URLs). Cached token-agnostically so a
// warmed photo keeps loading offline even after its signed URL rotates.
const IMG_CACHE = 'katitos-img-v1';
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
      // NO skipWaiting: a new version installs and WAITS, then activates on the
      // next clean launch (when no tab is open). This avoids swapping the app
      // out from under a running session — which caused the "it shows 3
      // different versions" flashing as each rapid deploy force-took-over.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== IMG_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // App-shell navigation: CACHE-FIRST. Serve the precached index.html instantly
  // so a cold launch paints the boot splash with ZERO network wait (the old
  // network-first path left the screen black for seconds on a slow connection),
  // and refresh the shell in the background for the next launch. (We already
  // never skipWaiting, so applying the new shell on next launch is by design.)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('/index.html');
        const network = fetch(req)
          .then((resp) => {
            if (resp.ok) void cache.put('/index.html', resp.clone());
            return resp;
          })
          .catch(() => undefined);
        return (
          cached ??
          (await network) ??
          new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        );
      })()
    );
    return;
  }

  const url = new URL(req.url);

  // The build stamp is the one thing that must NEVER come from a cache: it is
  // how the app finds out it is running an old bundle, and a cached copy would
  // cheerfully confirm that everything is fine forever.
  if (url.pathname === '/version.json') return;

  // Supabase storage photos: cache-first, token-agnostic (the signed-URL token
  // lives in the query string, so match ignoring search → a warmed photo keeps
  // loading offline and across token rotations). Revalidate in the background.
  if (/\/storage\/v1\/(object|render\/image)\//.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((resp) => {
            if (resp.ok) void cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => undefined);
        return cached ?? (await network) ?? Response.error();
      })()
    );
    return;
  }

  // Same-origin static assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((cached) => cached ?? fetch(req)));
  }
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  /** A picture (Android renders it; iOS ignores the field). */
  image?: string;
  /** Per-kind buzz pattern, so a love ping feels different to a wall note. */
  vibrate?: number[];
}

/**
 * Take over now — only ever when asked by hand.
 *
 * The install handler deliberately does not skipWaiting, so a deploy never
 * swaps the app out mid-session. This is the escape hatch behind the version
 * row in Settings: someone looked at "a newer version is waiting" and said yes.
 * The page reloads immediately afterwards, so nothing keeps running half-old.
 */
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

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
      // A second ping of the same kind should replace the first quietly rather
      // than stack — except it still needs to buzz, hence renotify.
      renotify: !!payload.tag,
      ...(payload.image ? { image: payload.image } : {}),
      ...(payload.vibrate ? { vibrate: payload.vibrate } : {}),
      data: { url: payload.url ?? '/' },
    } as NotificationOptions)
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
