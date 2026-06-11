import { Link } from 'react-router';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import { countdownTo, nextMonthsversary } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function FlowersWidget() {
  const { data: couple } = useCouple();
  const now = useNow();
  const next = nextMonthsversary(couple?.anniversary_day ?? 15, now);
  const c = countdownTo(next, now);
  return (
    <Link to="/flowers" className="block h-full">
      <Card className="flower-stage relative flex h-full flex-col justify-between gap-3 overflow-hidden">
        <div className="relative z-[1] flex items-start justify-between gap-2">
          <CardTitle className="text-xl">Next flowers</CardTitle>
          <span
            className="gilt-text candle-flicker text-2xl leading-none"
            aria-hidden="true"
          >
            ❀
          </span>
        </div>
        <div className="relative z-[1]">
          <p className="gilt-text font-display text-4xl font-semibold leading-none tabular-nums">
            {c.days}
            <span className="ml-1 align-baseline text-xl">d</span>
          </p>
          <p className="mt-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-copper">
            until the bouquet
          </p>
        </div>
      </Card>
    </Link>
  );
}
