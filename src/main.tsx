import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts — no render-blocking third-party request, and the woff2
// files are precached by the service worker so type renders offline too.
// font-display: swap ships in each file.
//
// The AGGREGATE file per weight, not the `latin-*` subset files: it declares
// every subset with its own `unicode-range`, so the browser fetches latin for
// the UI and cyrillic the moment a Russian word appears, and nothing else.
// Only the latin subsets were imported before — so every Cyrillic character
// in the app, and the stress mark she writes on спаси́бо (U+0301 lives in the
// cyrillic range), rendered in a system fallback. In the one app where
// Russian is the point. (The subset files carry no unicode-range at all, so
// importing latin AND cyrillic that way leaves two identical faces fighting.)
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
// The handwriting face. `--font-hand` named a font nobody had ever installed,
// so every "handwritten" caption in the album quietly came out as Cormorant.
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';
import './index.css';
import { App } from './app/App';

// A deploy renames hashed chunks; when an open tab fails to lazy-load one,
// Vite fires this. Reload once (guarded) to pull the fresh assets instead of
// dead-ending on a stale chunk — keeps silent auto-update safe.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'katitos:chunk-reload';
  if (!sessionStorage.getItem(KEY)) {
    sessionStorage.setItem(KEY, '1');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// The splash controller (SplashScreen) removes #boot once auth has resolved +
// a minimum time. This is ONLY a last-resort safety net for the case where the
// JS never boots at all (so React can't clear it) — long enough to never
// preempt a slow auth check.
window.setTimeout(() => document.getElementById('boot')?.remove(), 8000);
