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
import { supabase } from '@kernel/supabase';
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

  useEffect(() => {
    // getSession is the authoritative FIRST status. The change-listener is
    // ignored until that resolves, otherwise its INITIAL_SESSION event can flip
    // status (loading → anon → authed) and flash the home/login on boot.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!initialized.current) return;
      setSession(next);
      setStatus(next ? 'authed' : 'anon');
    });

    void (async () => {
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();

      if (existing) {
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
          setSession(data.session);
          setStatus(data.session ? 'authed' : 'anon');
        }
        return;
      }

      setStatus('anon');
      initialized.current = true;
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

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
  }, []);

  const devSwitchUser = useCallback(async (slot: DevSlot) => {
    setDevSlot(slot);
    setSlot(slot);
    await supabase.auth.signOut();
    const { email, password } = devUsers[slot];
    await supabase.auth.signInWithPassword({ email, password });
  }, []);

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
