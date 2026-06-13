import { useRouteError } from 'react-router';
import { Button, Empty } from '@kernel/ui';

const CHUNK_RELOAD_KEY = 'katitos:chunk-reload';

/**
 * A deploy renames the hashed chunks; an open tab that lazy-loads one *after*
 * the swap throws a dynamic-import error. Detect that shape so we can reload
 * once (fresh shell) instead of stranding the couple on a broken screen.
 */
function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return /dynamically imported module|module script failed|ChunkLoadError|Loading chunk|Failed to fetch/i.test(
    msg
  );
}

/**
 * Root-route `errorElement`. React Router routes render/loader throws here, so
 * a single bad render degrades to a recoverable screen — never a white void.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isChunkLoadError(error)) {
    // One-shot guarded reload — a stale chunk after deploy heals itself.
    if (typeof sessionStorage !== 'undefined') {
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return null;
      }
    }
  } else if (typeof sessionStorage !== 'undefined') {
    // A different (or recovered) error — release the one-shot guard.
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }

  if (import.meta.env.DEV) {
    console.error('Route error boundary caught:', error);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6">
      <Empty
        icon="🌹"
        title="Something slipped for a moment"
        hint="It's not you — let's try that again."
        action={
          <Button onClick={() => window.location.reload()}>
            Reload our place
          </Button>
        }
      />
    </div>
  );
}
