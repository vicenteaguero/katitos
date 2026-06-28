import { useEffect, useState } from 'react';
import { useAuth, usePartner } from '@kernel/auth';
import { useCouple, useUpdateMember } from '@kernel/couple';
import { usePushSubscribe } from '@kernel/push';
import { DateTime } from '@kernel/lib';
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  LoadingScreen,
  Select,
  toast,
} from '@kernel/ui';

function CoupleCard() {
  const { data: couple, isLoading } = useCouple();
  if (isLoading) return null;
  const since = couple?.relationship_start_date;

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <p className="eyebrow">The Programme</p>
        <CardTitle>Us</CardTitle>
      </div>
      {/* The anniversary is fixed forever — shown, never edited. */}
      <div>
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          Together since
        </p>
        <p className="mt-1 font-display text-xl text-fg">
          {since ? DateTime.fromISO(since).toFormat('LLLL d, yyyy') : '—'}
        </p>
        <p className="mt-1 font-sans text-xs text-muted">
          Our little anniversary every month on this day. 🤍
        </p>
      </div>
    </Card>
  );
}

function MeCard() {
  const { self } = usePartner();
  const update = useUpdateMember();
  const [form, setForm] = useState({
    display_name: '',
    emoji: '',
    city: '',
    country: '',
    lat: '',
    lng: '',
    timezone: '',
    native_language: 'es',
    learning_language: 'ru',
    preferred_currency: 'USD',
  });

  useEffect(() => {
    if (self) {
      setForm({
        display_name: self.display_name ?? '',
        emoji: self.emoji ?? '',
        city: self.city ?? '',
        country: self.country ?? '',
        lat: self.lat?.toString() ?? '',
        lng: self.lng?.toString() ?? '',
        timezone: self.timezone ?? '',
        native_language: self.native_language ?? 'es',
        learning_language: self.learning_language ?? 'ru',
        preferred_currency: self.preferred_currency ?? 'USD',
      });
    }
  }, [self]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="space-y-7">
      <div className="space-y-3">
        <p className="eyebrow">Dramatis Persona</p>
        <CardTitle>Me</CardTitle>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Emoji">
            <Input
              value={form.emoji}
              onChange={(e) => set('emoji', e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Name">
              <Input
                value={form.display_name}
                onChange={(e) => set('display_name', e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <Input
              type="number"
              value={form.lat}
              onChange={(e) => set('lat', e.target.value)}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              value={form.lng}
              onChange={(e) => set('lng', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Timezone" hint="IANA, e.g. America/Santiago">
          <Input
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          />
        </Field>
        <Field
          label="Preferred currency"
          hint="What amounts default to for me."
        >
          <Select
            value={form.preferred_currency}
            onChange={(e) => set('preferred_currency', e.target.value)}
          >
            <option value="USD">🇺🇸 USD</option>
            <option value="CLP">🇨🇱 CLP</option>
            <option value="RUB">🇷🇺 RUB</option>
            <option value="GEL">🇬🇪 GEL</option>
            <option value="TRY">🇹🇷 TRY</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="I speak">
            <Select
              value={form.native_language}
              onChange={(e) => set('native_language', e.target.value)}
            >
              <option value="es">Spanish</option>
              <option value="ru">Russian</option>
            </Select>
          </Field>
          <Field label="I'm learning">
            <Select
              value={form.learning_language}
              onChange={(e) => set('learning_language', e.target.value)}
            >
              <option value="ru">Russian</option>
              <option value="es">Spanish</option>
            </Select>
          </Field>
        </div>
      </div>
      <Button
        full
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            {
              display_name: form.display_name,
              emoji: form.emoji || null,
              city: form.city || null,
              country: form.country || null,
              lat: form.lat ? Number(form.lat) : null,
              lng: form.lng ? Number(form.lng) : null,
              timezone: form.timezone || null,
              native_language: form.native_language,
              learning_language: form.learning_language,
              preferred_currency: form.preferred_currency || null,
            },
            { onSuccess: () => toast.success('Saved') }
          )
        }
      >
        Save
      </Button>
    </Card>
  );
}

function NotificationsCard() {
  const { status, subscribe } = usePushSubscribe();
  const label =
    status === 'subscribed'
      ? 'Notifications on ✓'
      : status === 'needs-install'
        ? 'Add to Home Screen first'
        : status === 'unsupported'
          ? 'Not supported on this device'
          : status === 'denied'
            ? 'Permission denied'
            : 'Enable notifications';
  return (
    <Card className="space-y-7">
      <div className="space-y-3">
        <p className="eyebrow">House Notices</p>
        <CardTitle>Notifications</CardTitle>
      </div>
      <p className="font-sans text-sm leading-relaxed text-muted">
        Get a ping when your love opens the app or writes on the wall.
      </p>
      <Button
        full
        variant="secondary"
        disabled={
          status === 'subscribed' ||
          status === 'unsupported' ||
          status === 'needs-install'
        }
        onClick={() => void subscribe()}
      >
        {label}
      </Button>
    </Card>
  );
}

export function SettingsRoute() {
  const { signOut, isLocal } = useAuth();
  const { isLoading } = usePartner();
  if (isLoading) return <LoadingScreen />;

  return (
    <div className="curtain-reveal">
      <div className="curtain-stagger space-y-8">
        <CoupleCard />
        <MeCard />
        <NotificationsCard />
        {!isLocal && (
          <Button full variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
