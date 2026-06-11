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
      <Card className="lift-press flex h-full items-baseline justify-between gap-3">
        <CardTitle className="text-xl">Apart</CardTitle>
        <p className="font-display text-2xl font-semibold leading-none tracking-tight tabular-nums text-fg">
          {km != null ? formatDistance(km) : '—'}
        </p>
      </Card>
    </Link>
  );
}
