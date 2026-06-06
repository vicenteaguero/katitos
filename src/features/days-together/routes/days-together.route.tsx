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
      <div>
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
    <div className="space-y-4">
      <PageHeader title="Together" subtitle={`since ${start}`} />
      <Card className="text-center">
        <p className="text-5xl font-bold text-accent">
          {days.toLocaleString()}
        </p>
        <p className="text-sm text-muted">days together</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardTitle>Weeks</CardTitle>
          <p className="text-2xl font-bold">{Math.floor(days / 7)}</p>
        </Card>
        <Card>
          <CardTitle>Monthsversaries</CardTitle>
          <p className="text-2xl font-bold">{months}</p>
        </Card>
      </div>
      <Card>
        <CardTitle>Next monthsversary</CardTitle>
        <p className="text-xl font-bold tabular-nums text-accent">
          {c.isPast ? 'today! 💐' : `${c.days}d ${c.hours}h ${c.minutes}m`}
        </p>
        <p className="text-xs text-muted">{next.toFormat('cccc, LLL d')}</p>
      </Card>
    </div>
  );
}
