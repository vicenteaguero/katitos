import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button, Sheet } from '@kernel/ui';
import { usePushSubscribe, isStandalone } from '@kernel/push';

const KEY = 'katitos:notif-prompt-seen';

/**
 * First thing on a standalone (installed-to-home-screen) launch, when
 * notifications aren't on yet: the whole point of the app is the partner's
 * pings. Dismissible for the session, but re-surfaces on a later cold launch
 * while still off, so it's never lost. Never shown in a plain browser tab.
 */
export function NotificationPrompt() {
  const { status, subscribe } = usePushSubscribe();
  const [seen, setSeen] = useState(() => sessionStorage.getItem(KEY) === '1');
  // Let the async subscription check settle so already-on users never flash it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const show = ready && isStandalone() && status === 'idle' && !seen;
  if (!show) return null;

  const dismiss = () => {
    sessionStorage.setItem(KEY, '1');
    setSeen(true);
  };

  return (
    <Sheet open onClose={dismiss} title="Stay close" size="half">
      <div className="flex flex-col items-center gap-5 pb-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-gold">
          <BellRing className="h-7 w-7" />
        </span>
        <p className="font-sans text-sm leading-relaxed text-muted">
          Turn on notifications so you never miss a 💌, a note on the wall, or
          when your love opens the app.
        </p>
        <Button
          full
          onClick={() => {
            void subscribe();
            dismiss();
          }}
        >
          Enable notifications
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="font-sans text-xs text-muted active:text-fg"
        >
          Maybe later
        </button>
      </div>
    </Sheet>
  );
}
