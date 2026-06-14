import { useEffect, useState } from 'react';
import { useAuth, usePartner } from '@kernel/auth';
import { useCouple, useUpdateCouple, useUpdateMember } from '@kernel/couple';
import { usePushSubscribe } from '@kernel/push';
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
  Select,
  toast,
} from '@kernel/ui';

function CoupleCard() {
  const { data: couple, isLoading } = useCouple();
  const update = useUpdateCouple();
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (couple) setStartDate(couple.relationship_start_date ?? '');
  }, [couple]);

  if (isLoading) return null;

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">The Programme</p>
        <CardTitle>Us</CardTitle>
      </div>
      <Field
        label="Together since"
        hint="Every month, this day is our little anniversary."
      >
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </Field>
      <Button
        full
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            {
              relationship_start_date: startDate || null,
              // Monthsversary day is just the day-of-month of when we started —
              // no separate, confusing field needed.
              anniversary_day: startDate
                ? new Date(`${startDate}T00:00:00`).getDate()
                : 15,
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
      <PageHeader title="Settings" subtitle="Tune our little theater." />
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
