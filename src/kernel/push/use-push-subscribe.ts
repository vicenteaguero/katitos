import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';

export type PushStatus =
  | 'idle'
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'needs-install'
  | 'working';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window
  );
}

/** Running as an installed PWA (iOS exposes web push only when standalone). */
function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/**
 * Distinguish "this browser can never do push" from "iOS in a Safari tab, where
 * push only appears once the PWA is installed to the home screen".
 */
function unsupportedReason(): 'unsupported' | 'needs-install' {
  return !isStandalone() &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
    ? 'needs-install'
    : 'unsupported';
}

/**
 * Subscribe this device to Web Push and persist the row the partner needs to
 * reach it. Idempotent — upserts on the endpoint, so calling it again after the
 * browser silently rotates the subscription just refreshes the stored keys.
 * This is what makes "Send love" land as a real notification: without a live
 * row here, the server has nothing to push to.
 */
async function persistSubscription(
  reg: ServiceWorkerRegistration,
  userId: string,
  vapidKey: string
): Promise<void> {
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));
  const json = sub.toJSON();
  if (!json.keys) return;
  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  );
}

/**
 * Keep this device's push subscription alive whenever permission is already
 * granted — no prompt, no UI. Mount once near the app root so every launch
 * re-persists the (possibly rotated) subscription, healing the common case
 * where a partner enabled notifications once but the stored row went stale and
 * loves stopped arriving.
 */
export function useEnsurePushSubscription(): void {
  const userId = useUserId();

  useEffect(() => {
    if (!userId || !supported() || Notification.permission !== 'granted') {
      return;
    }
    let cancelled = false;
    void navigator.serviceWorker.ready.then(async (reg) => {
      if (cancelled) return;
      try {
        await persistSubscription(
          reg,
          userId,
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        );
      } catch {
        /* best-effort — Settings still offers an explicit retry */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
}

/**
 * Subscribe this device to Web Push and persist the subscription so the partner
 * can notify it. The plumbing is identical locally and in prod; actual delivery
 * to iOS requires an installed PWA over HTTPS.
 */
export function usePushSubscribe() {
  const userId = useUserId();
  const [status, setStatus] = useState<PushStatus>('idle');

  useEffect(() => {
    if (!supported()) {
      setStatus(unsupportedReason());
      return;
    }
    void navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) setStatus('subscribed');
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported()) {
      setStatus(unsupportedReason());
      return;
    }
    setStatus('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      if (userId) {
        await persistSubscription(
          reg,
          userId,
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        );
      }
      setStatus('subscribed');
    } catch {
      setStatus('idle');
    }
  }, [userId]);

  return { status, subscribe };
}
