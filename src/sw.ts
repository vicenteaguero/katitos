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

/**
 * A tiny stable hash of the precache manifest — the shell cache is named by
 * it, so every deploy gets a cache of its own and `activate` throws the last
 * one away. A single fixed name kept every deploy's hashed assets forever.
 */
function fingerprint(entries: Array<{ url: string; revision: string | null }>) {
  let h = 2166136261;
  for (const e of entries) {
    for (const ch of `${e.url}@${e.revision ?? ''}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0).toString(36);
}
// Read ONCE: the build tool looks for exactly one mention of this token.
const MANIFEST = self.__WB_MANIFEST;
const CACHE = `katitos-shell-${fingerprint(MANIFEST)}`;
// Photos from Supabase storage (signed URLs). Cached token-agnostically so a
// warmed photo keeps loading offline even after its signed URL rotates.
const IMG_CACHE = 'katitos-img-v2';
/** How many photographs are worth keeping on the phone. */
const IMG_CACHE_MAX = 400;
// Her recordings, apart from the photographs: a lesson's worth of clips must
// not be pushed out by an afternoon of browsing the album.
const AUDIO_CACHE = 'katitos-audio-v1';
const AUDIO_CACHE_MAX = 600;
const AUDIO_BUCKETS =
  /\/storage\/v1\/object\/(sign|public)\/(language-audio|quiz-media)\//;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  ...MANIFEST.map((entry) => entry.url),
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

/**
 * Keep one copy of each photograph, and not too many of them.
 *
 * Entries were keyed by the FULL url — signed token and all — while lookups
 * matched with `ignoreSearch`, so every hourly token rotation quietly stored
 * another complete copy of the same picture, forever, in a cache that was never
 * trimmed. An album browsed over a few weeks was paying for the same photos
 * dozens of times over on a phone.
 */
async function storeObject(
  cache: Cache,
  req: Request,
  resp: Response,
  max: number
) {
  // Drop the token before storing: the object path IS the identity, and this
  // is what makes `ignoreSearch` reads and writes agree with each other.
  const key = new Request(new URL(req.url).origin + new URL(req.url).pathname, {
    headers: req.headers,
  });
  await cache.put(key, resp);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  // Oldest first — `cache.keys()` is insertion-ordered.
  await Promise.all(
    keys.slice(0, keys.length - max).map((k) => cache.delete(k))
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== IMG_CACHE && k !== AUDIO_CACHE)
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
  // Only a response the worker can READ gets stored: an <img> or <audio>
  // fetched without `crossOrigin` comes back opaque (`ok` false) and is
  // passed through untouched — which is why every loader in the app now
  // asks for CORS. Storage answers with `Access-Control-Allow-Origin: *`.
  if (/\/storage\/v1\/(object|render\/image)\//.test(url.pathname)) {
    const audio = AUDIO_BUCKETS.test(url.pathname);
    event.respondWith(
      (async () => {
        const cache = await caches.open(audio ? AUDIO_CACHE : IMG_CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((resp) => {
            if (resp.ok)
              void storeObject(
                cache,
                req,
                resp.clone(),
                audio ? AUDIO_CACHE_MAX : IMG_CACHE_MAX
              );
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
