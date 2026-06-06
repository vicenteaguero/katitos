import { useState, type FormEvent } from 'react';
import { useAuth } from '@kernel/auth';
import { Button, Field, Input } from '@kernel/ui';

/** Real Supabase email/password login. Shown in prod mode when signed out. */
export function LoginScreen() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithPassword(email, password);
    setError(err);
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-full max-w-app items-center justify-center p-6">
      <form onSubmit={submit} className="w-full space-y-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-accent">Katitos</h1>
          <p className="mt-1 text-sm text-muted">our little place</p>
        </div>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" error={error ?? undefined}>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button full type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
