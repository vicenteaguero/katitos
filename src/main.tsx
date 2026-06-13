import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
