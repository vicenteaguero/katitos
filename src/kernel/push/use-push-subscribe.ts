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
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        ),
      });
      const json = sub.toJSON();
      if (userId && json.keys) {
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
      setStatus('subscribed');
    } catch {
      setStatus('idle');
    }
  }, [userId]);

  return { status, subscribe };
}
