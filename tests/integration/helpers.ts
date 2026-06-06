import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const USER_A = {
  email: 'vicente@katitos.local',
  password: 'katitos123',
};
export const USER_B = {
  email: 'anastasia@katitos.local',
  password: 'katitos123',
};

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signedInClient(creds: {
  email: string;
  password: string;
}): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword(creds);
  if (error) throw error;
  return client;
}

export async function supabaseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}
