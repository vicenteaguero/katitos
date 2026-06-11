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
      <div className="curtain-reveal">
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
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title="Time"
        subtitle={`${partner.display_name} is ${offsetText}`}
      />

      <section className="space-y-7">
        <p className="eyebrow">Two Cities, Two Clocks</p>

        {/* Two gilt loge panels stitched by the gold seam — her time, his time. */}
        <div className="velvet-2 gilt-hairline relative rounded-none shadow-loge">
          <div className="grid grid-cols-2 items-stretch">
            <div className="space-y-2 px-6 py-8 text-center">
              <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted">
                {self.display_name}
              </p>
              <p className="candle-flicker font-display text-5xl font-light tabular-nums text-fg">
                {timeInZone(self.timezone, now)}
              </p>
              <p className="font-sans text-xs tracking-wide text-muted">
                {self.city}
              </p>
            </div>

            <div className="space-y-2 px-6 py-8 text-center">
              <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
                {partner.display_name}
              </p>
              <p className="candle-flicker font-display text-5xl font-light tabular-nums text-gold">
                {timeInZone(partner.timezone, now)}
              </p>
              <p className="font-sans text-xs tracking-wide text-muted">
                {partner.city}
              </p>
            </div>
          </div>

          {/* The relationship as one gold-stitched line between her box and his. */}
          <div
            className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[image:var(--grad-sash)]"
            aria-hidden="true"
          />
        </div>
      </section>

      <section className="space-y-7">
        <p className="eyebrow">Convert a Time</p>
        <Card className="bg-lapis space-y-5">
          <CardTitle>From your hours to theirs</CardTitle>
          <Field label={`Your time (${self.city})`}>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          {converted && (
            <>
              <hr className="seam" aria-hidden="true" />
              <p className="font-sans text-sm text-muted">
                For {partner.display_name}, that is
              </p>
              <p className="font-display text-2xl font-medium tabular-nums text-fg">
                {converted}
              </p>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
