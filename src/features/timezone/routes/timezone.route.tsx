import { useState } from 'react';
import { Link } from 'react-router';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { timeInZone, zoneOffsetHours } from '@kernel/lib';
import {
  Button,
  Card,
  CardTitle,
  Empty,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
} from '@kernel/ui';

export function TimezoneRoute() {
  const { self, partner, isLoading } = usePartner();
  const now = useNow(1000);
  const [when, setWhen] = useState('');

  if (isLoading) return <LoadingScreen />;
  if (!self?.timezone || !partner?.timezone) {
    return (
      <div>
        <PageHeader title="Time" />
        <Empty
          icon="🕰️"
          title="Set your timezones"
          hint="Add both timezones in Settings."
          action={
            <Link to="/settings">
              <Button>Open settings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const offset = zoneOffsetHours(self.timezone, partner.timezone, now);
  const offsetText =
    offset === 0
      ? 'same time'
      : offset > 0
        ? `${offset}h ahead of you`
        : `${Math.abs(offset)}h behind you`;
  const converted = when
    ? DateTime.fromISO(when, { zone: self.timezone })
        .setZone(partner.timezone)
        .toFormat('cccc, LLL d · HH:mm')
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Time"
        subtitle={`${partner.display_name} is ${offsetText}`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <CardTitle>{self.display_name}</CardTitle>
          <p className="text-3xl font-bold tabular-nums">
            {timeInZone(self.timezone, now)}
          </p>
          <p className="text-xs text-muted">{self.city}</p>
        </Card>
        <Card className="text-center">
          <CardTitle>{partner.display_name}</CardTitle>
          <p className="text-3xl font-bold tabular-nums text-accent">
            {timeInZone(partner.timezone, now)}
          </p>
          <p className="text-xs text-muted">{partner.city}</p>
        </Card>
      </div>
      <Card className="space-y-2">
        <CardTitle>Convert a time</CardTitle>
        <Field label={`Your time (${self.city})`}>
          <Input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
        {converted && (
          <p className="text-sm">
            = <b>{converted}</b> for {partner.display_name}
          </p>
        )}
      </Card>
    </div>
  );
}
