import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-provider';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** The current authenticated user's id, or null. */
export function useUserId(): string | null {
  return useAuth().user?.id ?? null;
}
