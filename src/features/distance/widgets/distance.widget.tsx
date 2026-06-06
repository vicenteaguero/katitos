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
    <Link to="/distance">
      <Card className="h-full">
        <CardTitle>Apart</CardTitle>
        <p className="text-2xl font-bold text-accent">
          {km != null ? formatDistance(km) : '—'}
        </p>
      </Card>
    </Link>
  );
}
