import { createBrowserRouter } from 'react-router';
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
      ...featureRegistry.routes,
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
