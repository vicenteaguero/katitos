import { useState, type FormEvent } from 'react';
import { useAuth } from '@kernel/auth';
import { Button, Field, Input, KatitosMark } from '@kernel/ui';

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
    <div className="mx-auto flex min-h-full max-w-app items-center justify-center px-[1.75rem] py-[3rem]">
      <div className="curtain-reveal w-full">
        {/* The entrance - a footlight pool rising behind the mark and names. */}
        <div className="footlight mb-[3rem] flex flex-col items-center text-center">
          <KatitosMark size={92} className="mb-6" />
          <h1 className="font-display gilt-text text-5xl font-semibold leading-none tracking-tight">
            Katitos
          </h1>
          <div className="eyebrow mt-5">Anastasia &amp; Vicente</div>
          <p className="font-display mt-4 text-xl font-light italic text-muted">
            our little place
          </p>
        </div>

        {/* The framed loge where the two of us are admitted. */}
        <form
          onSubmit={submit}
          className="gilt-hairline velvet-2 shadow-loge space-y-6 p-[1.75rem]"
        >
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
          <Button full size="lg" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Enter'}
          </Button>
        </form>
      </div>
    </div>
  );
}
