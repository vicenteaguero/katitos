import { Link } from 'react-router';
import { usePartner } from '@kernel/auth';
import { formatDistance, haversineKm, kmToMiles } from '@kernel/lib';
import { Button, Card, Empty, LoadingScreen, PageHeader } from '@kernel/ui';

export function DistanceRoute() {
  const { self, partner, isLoading } = usePartner();

  if (isLoading) return <LoadingScreen />;
  if (
    self?.lat == null ||
    self?.lng == null ||
    partner?.lat == null ||
    partner?.lng == null
  ) {
    return (
      <div>
        <PageHeader title="Distance" />
        <Empty
          icon="🗺️"
          title="Add your cities"
          hint="Set both locations in Settings to see how far apart you are."
          action={
            <Link to="/settings">
              <Button>Open settings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const km = haversineKm(
    { lat: self.lat, lng: self.lng },
    { lat: partner.lat, lng: partner.lng }
  );
  const mapsUrl = `https://www.google.com/maps/dir/${self.lat},${self.lng}/${partner.lat},${partner.lng}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Distance"
        subtitle={`${self.city ?? 'you'} ↔ ${partner.city ?? 'them'}`}
      />
      <Card className="text-center">
        <p className="text-5xl font-bold text-accent">{formatDistance(km)}</p>
        <p className="text-sm text-muted">
          {Math.round(kmToMiles(km)).toLocaleString()} miles apart
        </p>
      </Card>
      <a href={mapsUrl} target="_blank" rel="noreferrer">
        <Button full variant="secondary">
          See on the map
        </Button>
      </a>
    </div>
  );
}
