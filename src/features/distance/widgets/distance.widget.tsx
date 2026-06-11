import { Link } from 'react-router';
import { usePartner } from '@kernel/auth';
import { formatDistance, haversineKm } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function DistanceWidget() {
  const { self, partner } = usePartner();
  const ready =
    self?.lat != null &&
    self?.lng != null &&
    partner?.lat != null &&
    partner?.lng != null;
  const km = ready
    ? haversineKm(
        { lat: self.lat!, lng: self.lng! },
        { lat: partner.lat!, lng: partner.lng! }
      )
    : null;
  return (
    <Link to="/distance" className="block h-full">
      <Card className="lift-press flex h-full flex-col">
        <CardTitle className="font-sans text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          Apart
        </CardTitle>
        <p className="gilt-text candle-flicker mt-auto font-display text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {km != null ? formatDistance(km) : '—'}
        </p>
        <div className="mt-3 h-px w-10 bg-copper" aria-hidden="true" />
      </Card>
    </Link>
  );
}
