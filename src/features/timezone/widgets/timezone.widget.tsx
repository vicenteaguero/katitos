import { Link } from 'react-router';
import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { timeInZone } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function TimezoneWidget() {
  const { self, partner } = usePartner();
  const now = useNow(1000);
  return (
    <Link to="/timezone">
      <Card className="bg-lapis h-full">
        <CardTitle>Clocks</CardTitle>
        <div className="mt-4 space-y-2 font-sans text-sm tabular-nums">
          <div className="flex items-baseline justify-between">
            <span className="text-muted">{self?.emoji ?? 'you'}</span>
            <span className="font-display text-lg text-fg">
              {self?.timezone ? timeInZone(self.timezone, now) : '—'}
            </span>
          </div>
          <hr className="seam" aria-hidden="true" />
          <div className="flex items-baseline justify-between">
            <span className="text-copper">{partner?.emoji ?? 'them'}</span>
            <span className="candle-flicker font-display text-lg text-gold">
              {partner?.timezone ? timeInZone(partner.timezone, now) : '—'}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
