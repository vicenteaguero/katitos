import { Link } from 'react-router';
import { usePartner } from '@kernel/auth';
import { formatDistance, haversineKm, kmToMiles } from '@kernel/lib';
import { Button, Empty, LoadingScreen, PageHeader } from '@kernel/ui';

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
      <div className="curtain-reveal">
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
    <div className="curtain-reveal space-y-act">
      <PageHeader
        title="Distance"
        subtitle="The kilometres between us — measured, never felt"
      />

      {/* The lit stage: a single poignant stat breathing under a footlight,
          the two cities joined as one gold-stitched line across the world. */}
      <section className="relative">
        <span className="footlight" aria-hidden="true" />
        <p className="eyebrow mb-7">As the crow flies</p>
        <div className="relative z-[1] rounded-lg bg-surface-2 px-stage py-10 text-center">
          <p
            className="gilt-text candle-flicker font-display text-5xl font-semibold leading-none tracking-tight tabular-nums"
            aria-label={`${formatDistance(km)} apart`}
          >
            {formatDistance(km)}
          </p>
          <p className="mt-4 font-sans text-sm font-medium tabular-nums text-muted">
            {Math.round(kmToMiles(km)).toLocaleString()} miles apart
          </p>

          {/* Two points, one arc — her city flowing into his across the seam. */}
          <div className="mt-8 flex items-center justify-center gap-4 font-display text-xl italic tracking-tight text-fg">
            <span className="min-w-0 flex-1 truncate text-right">
              {self.city ?? 'you'}
            </span>
            <span className="text-copper not-italic" aria-hidden="true">
              ✦
            </span>
            <span className="min-w-0 flex-1 truncate text-left">
              {partner.city ?? 'them'}
            </span>
          </div>
          <hr className="seam mt-4" aria-hidden="true" />
        </div>
      </section>

      <a href={mapsUrl} target="_blank" rel="noreferrer">
        <Button full variant="secondary">
          See on the map
        </Button>
      </a>
    </div>
  );
}
