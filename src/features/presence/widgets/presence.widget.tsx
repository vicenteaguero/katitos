import { Link } from 'react-router';
import { relativeTime } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';
import { usePartnerPresence } from '../hooks/use-partner-presence';

export function PartnerPresenceWidget() {
  const { partner, online } = usePartnerPresence();
  return (
    <Link to="/connection">
      <Card className="h-full">
        <CardTitle>{partner?.display_name ?? 'Your love'}</CardTitle>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-success' : 'bg-muted'}`}
          />
          <span className="text-sm">
            {online
              ? 'online now'
              : partner?.last_seen_at
                ? relativeTime(partner.last_seen_at)
                : 'offline'}
          </span>
        </div>
      </Card>
    </Link>
  );
}
