import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (latin subset, only the weights we use) — no render-blocking
// third-party request, and the woff2 files are precached by the service worker
// so type renders offline too. font-display: swap ships in each file.
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
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

// The splash component removes #boot the instant it has painted over it (no
// gap). This is only a safety net for paths that never show the splash (e.g.
// straight to the login screen) — keep #boot up a beat, then clear it.
window.setTimeout(() => document.getElementById('boot')?.remove(), 2500);
