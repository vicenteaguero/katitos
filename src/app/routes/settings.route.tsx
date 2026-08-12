import { useEffect, useState } from 'react';
import { useAuth, usePartner } from '@kernel/auth';
import { useUpdateMember } from '@kernel/couple';
import { usePushSubscribe } from '@kernel/push';
import {
  Button,
  Field,
  Input,
  LoadingScreen,
  Select,
  Switch,
  toast,
} from '@kernel/ui';
import { CURRENCIES } from '@kernel/lib';
import { PhraseEditor } from '@features/love';

// Imported, never re-listed: this file used to keep its own copy, so adding a
// currency meant remembering two places and EUR would have been missing here.

/** Just my emoji + the default converter pair (from → to). Everything else
 *  (name, place, timezone, languages) lives in the DB — only two of us. */
function MeCard() {
  const { self } = usePartner();
  const update = useUpdateMember();
  const [form, setForm] = useState({
    emoji: '',
    currency_from: 'CLP',
    preferred_currency: 'RUB',
  });

  useEffect(() => {
    if (self)
      setForm({
        emoji: self.emoji ?? '',
        currency_from: self.currency_from ?? 'CLP',
        preferred_currency: self.preferred_currency ?? 'RUB',
      });
  }, [self]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[3.5rem_1fr_1fr] items-end gap-2.5">
        <Field label="Emoji">
          <Input
            value={form.emoji}
            onChange={(e) => set('emoji', e.target.value)}
            className="text-center"
          />
        </Field>
        <Field label="From">
          <Select
            value={form.currency_from}
            onChange={(e) => set('currency_from', e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To">
          <Select
            value={form.preferred_currency}
            onChange={(e) => set('preferred_currency', e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button
        full
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            {
              emoji: form.emoji || null,
              currency_from: form.currency_from,
              preferred_currency: form.preferred_currency,
            },
            { onSuccess: () => toast.success('Saved') }
          )
        }
      >
        Save
      </Button>
    </div>
  );
}

function NotificationsRow() {
  const { status, subscribe } = usePushSubscribe();
  const on = status === 'subscribed';
  const note =
    status === 'needs-install'
      ? 'Add to Home Screen first'
      : status === 'unsupported'
        ? 'Not supported here'
        : status === 'denied'
          ? 'Blocked in your settings'
          : null;
  const lockedOff =
    status === 'unsupported' ||
    status === 'needs-install' ||
    status === 'denied' ||
    status === 'working';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-fg">Notifications</p>
        {note && <p className="font-sans text-xs text-muted">{note}</p>}
      </div>
      <Switch
        checked={on}
        disabled={on || lockedOff}
        onChange={() => {
          if (!on) void subscribe();
        }}
        label="Notifications"
      />
    </div>
  );
}

export function SettingsRoute() {
  const { signOut, isLocal } = useAuth();
  const { self, isLoading } = usePartner();
  if (isLoading) return <LoadingScreen />;

  return (
    <div className="curtain-reveal">
      <div className="curtain-stagger space-y-4">
        <MeCard />
        <NotificationsRow />
        {/* Admin only — she receives the sweet nothings, he writes them. */}
        {self?.is_admin && <PhraseEditor />}
        {!isLocal && (
          <Button full variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
