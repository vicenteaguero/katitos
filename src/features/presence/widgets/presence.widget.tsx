import { Link } from 'react-router';
import { relativeTime } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';
import { usePartnerPresence } from '../hooks/use-partner-presence';

export function PartnerPresenceWidget() {
  const { partner, online } = usePartnerPresence();
  return (
    <Link to="/connection" className="lift-press block h-full">
      <Card className="h-full">
        <CardTitle>{partner?.display_name ?? 'Your love'}</CardTitle>
        <div className="mt-3 flex items-center gap-2.5">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${online ? 'candle-flicker bg-purple' : 'bg-muted'}`}
            aria-hidden="true"
          />
          <span className="font-sans text-sm text-muted">
            {online
              ? 'here with you now'
              : partner?.last_seen_at
                ? relativeTime(partner.last_seen_at)
                : 'offline'}
          </span>
        </div>
      </Card>
    </Link>
  );
}
