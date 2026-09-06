import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { clearPersisted } from '@kernel/query';
import {
  devUsers,
  getDevSlot,
  isLocalAuth,
  setDevSlot,
  type DevSlot,
} from './dev-auth';

export interface AuthContextValue {
  status: 'loading' | 'authed' | 'anon';
  session: Session | null;
  user: User | null;
  isLocal: boolean;
  devSlot: DevSlot | null;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Local-only: switch which seeded account is signed in. */
  devSwitchUser: (slot: DevSlot) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

/** Which account this device's caches belong to. */
const LAST_USER = 'katitos:last-user';

/**
 * Forget everything this device remembers for the previous person.
 *
 * The persisted query snapshot is painted before the server is asked, for
 * whoever opens the app next - rows the server would never hand the other
 * account, the hidden gift included - and the photo cache serves by path
 * without ever checking the signature. On a shared computer, signing out has
 * to actually empty the room.
 */
function forgetPreviousUser(qc: QueryClient) {
  qc.clear();
  clearPersisted();
  try {
    localStorage.removeItem(LAST_USER);
  } catch {
    /* ignore */
  }
  if (typeof caches !== 'undefined') {
    void caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('katitos-img'))
            .map((k) => caches.delete(k))
        )
      )
      .catch(() => undefined);
  }
}

/**
 * Note who is signed in - and if it is not who it was, forget the previous
 * person first. Covers the case sign-out cannot: a session that expired and a
 * different account signed in over it.
 */
function rememberUser(qc: QueryClient, session: Session | null) {
  if (!session) return;
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_USER);
  } catch {
    /* ignore */
  }
  if (last && last !== session.user.id) forgetPreviousUser(qc);
  try {
    localStorage.setItem(LAST_USER, session.user.id);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>(
    'loading'
  );
  const [devSlot, setSlot] = useState<DevSlot | null>(
    isLocalAuth ? getDevSlot() : null
  );
  const bootstrapped = useRef(false);
  const initialized = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    // getSession is the authoritative FIRST status. The change-listener is
    // ignored until that resolves, otherwise its INITIAL_SESSION event can flip
    // status (loading → anon → authed) and flash the home/login on boot.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!initialized.current) return;
      setSession(next);
      setStatus(next ? 'authed' : 'anon');
      rememberUser(qc, next);
    });

    void (async () => {
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();

      if (existing) {
        rememberUser(qc, existing);
        setSession(existing);
        setStatus('authed');
        initialized.current = true;
        return;
      }

      // Local mode: auto sign-in as the remembered seeded account.
      if (isLocalAuth && !bootstrapped.current) {
        bootstrapped.current = true;
        const slot = getDevSlot();
        const { email, password } = devUsers[slot];
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        initialized.current = true;
        if (error) {
          setStatus('anon');
        } else {
          rememberUser(qc, data.session);
          setSession(data.session);
          setStatus(data.session ? 'authed' : 'anon');
        }
        return;
      }

      setStatus('anon');
      initialized.current = true;
    })();

    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    forgetPreviousUser(qc);
  }, [qc]);

  const devSwitchUser = useCallback(
    async (slot: DevSlot) => {
      setDevSlot(slot);
      setSlot(slot);
      await supabase.auth.signOut();
      forgetPreviousUser(qc);
      const { email, password } = devUsers[slot];
      await supabase.auth.signInWithPassword({ email, password });
    },
    [qc]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isLocal: isLocalAuth,
      devSlot,
      signInWithPassword,
      signOut,
      devSwitchUser,
    }),
    [status, session, devSlot, signInWithPassword, signOut, devSwitchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
