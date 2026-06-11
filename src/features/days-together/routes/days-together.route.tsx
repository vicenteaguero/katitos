import { Link } from 'react-router';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import {
  countdownTo,
  daysTogether,
  monthsversaryCount,
  nextMonthsversary,
} from '@kernel/lib';
import {
  Button,
  Card,
  CardTitle,
  Empty,
  LoadingScreen,
  PageHeader,
} from '@kernel/ui';

export function DaysTogetherRoute() {
  const { data: couple, isLoading } = useCouple();
  const now = useNow(1000);

  if (isLoading) return <LoadingScreen />;
  if (!couple?.relationship_start_date) {
    return (
      <div className="curtain-reveal">
        <PageHeader title="Together" />
        <Empty
          icon="💞"
          title="No start date yet"
          hint="Set when you became you-two in Settings."
          action={
            <Link to="/settings">
              <Button>Open settings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const start = couple.relationship_start_date;
  const days = daysTogether(start);
  const months = monthsversaryCount(start);
  const next = nextMonthsversary(couple.anniversary_day ?? 15, now);
  const c = countdownTo(next, now);

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader title="Together" subtitle={`since ${start}`} />

      {/* The running tally — a lit tonal stage, the grand gilt numeral. */}
      <section className="space-y-7">
        <p className="eyebrow">Our Running Tally</p>
        <div className="footlight">
          <div className="relative overflow-hidden rounded-lg bg-surface-2 px-7 py-12 text-center">
            <p className="font-display text-base font-medium uppercase tracking-[0.28em] text-brown">
              Days Together
            </p>
            <p className="gilt-text gold-shimmer mt-5 font-display text-7xl font-semibold leading-none tabular-nums">
              {days.toLocaleString()}
            </p>
            <div className="seam mx-auto mt-8 h-px w-2/3" aria-hidden="true" />
            <p className="mt-5 font-display text-xl italic font-light text-brown">
              and still counting
            </p>
          </div>
        </div>
      </section>

      {/* The supporting program — small gilded loge cards. */}
      <section className="space-y-7">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          The Program
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <CardTitle className="text-lg">Weeks</CardTitle>
            <p className="gilt-text mt-3 font-display text-4xl font-semibold tabular-nums">
              {Math.floor(days / 7).toLocaleString()}
            </p>
          </Card>
          <Card className="text-center">
            <CardTitle className="text-lg">Monthsversaries</CardTitle>
            <p className="gilt-text mt-3 font-display text-4xl font-semibold tabular-nums">
              {months.toLocaleString()}
            </p>
          </Card>
        </div>
      </section>

      {/* The next act — the countdown to come. */}
      <section className="space-y-7">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          The Next Act
        </p>
        <Card className="text-center">
          <CardTitle>Next monthsversary</CardTitle>
          <p className="gilt-text gold-shimmer mt-4 font-display text-3xl font-semibold tabular-nums">
            {c.isPast ? 'today! 💐' : `${c.days}d ${c.hours}h ${c.minutes}m`}
          </p>
          <p className="mt-4 font-sans text-sm tracking-[0.02em] text-muted">
            {next.toFormat('cccc, LLL d')}
          </p>
        </Card>
      </section>
    </div>
  );
}
