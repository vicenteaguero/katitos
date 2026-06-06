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
      <Card className="h-full">
        <CardTitle>Clocks</CardTitle>
        <div className="mt-1 space-y-0.5 text-sm tabular-nums">
          <div className="flex justify-between">
            <span className="text-muted">{self?.emoji ?? 'you'}</span>
            <span>{self?.timezone ? timeInZone(self.timezone, now) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{partner?.emoji ?? 'them'}</span>
            <span className="text-accent">
              {partner?.timezone ? timeInZone(partner.timezone, now) : '—'}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
