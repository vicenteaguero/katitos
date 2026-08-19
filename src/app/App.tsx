import { RouterProvider } from 'react-router';
import { Providers } from './providers';
import { router } from './router';
import { AutoUpdate } from './shell/auto-update';

export function App() {
  return (
    <Providers>
      {/* Above the router on purpose: whether this app is the current version
          is not a question about which screen you are on. */}
      <AutoUpdate />
      <RouterProvider router={router} />
    </Providers>
  );
}
