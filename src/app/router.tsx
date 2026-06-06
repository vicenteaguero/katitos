import { createBrowserRouter } from 'react-router';
import { AppShell } from './shell/app-shell';
import { HomeRoute } from './routes/home.route';
import { SettingsRoute } from './routes/settings.route';
import { NotFoundRoute } from './routes/not-found.route';
import { featureRegistry } from './features.registry';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      ...featureRegistry.routes,
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
