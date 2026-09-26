import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './shell/app-shell';
import { RouteErrorBoundary } from './shell/error-boundary';
import { HomeRoute } from './routes/home.route';
import { SettingsRoute } from './routes/settings.route';
import { NotFoundRoute } from './routes/not-found.route';
import { featureRegistry } from './features.registry';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    // Catch render/loader throws (incl. stale-chunk imports) so the PWA
    // degrades to a recoverable screen instead of a white void.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      // The streak became Habits, and a year of push notifications deep-link to
      // the old path. A dead link on a lock screen is a small betrayal.
      { path: 'streak', element: <Navigate to="/habits" replace /> },
      { path: 'five', element: <Navigate to="/habits" replace /> },
      ...featureRegistry.routes,
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);

// A tapped notification, while the app is already open: the service worker
// asks it to move rather than reloading it (see sw.ts, notificationclick).
navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as { type?: string; url?: string } | null;
  if (data?.type !== 'navigate' || !data.url) return;
  const url = new URL(data.url, location.origin);
  if (url.origin !== location.origin) return;
  void router.navigate(url.pathname + url.search + url.hash);
});
