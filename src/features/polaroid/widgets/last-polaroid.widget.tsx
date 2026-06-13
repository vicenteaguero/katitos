import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { relativeTime } from '@kernel/lib';
import { usePolaroids } from '../api/polaroid.queries';
import { PolaroidImage } from '../components/polaroid-image';

/**
 * Home: our most recent polaroid, full-bleed. Falls back to a gentle prompt to
 * take today's photo when the shoebox is still empty.
 */
export function LastPolaroidWidget() {
  const { data } = usePolaroids();
  const last = data?.[0];

  return (
    <Link to="/polaroid" className="block">
      <Card className="lift-press flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-xl">Last polaroid</CardTitle>
          {last && (
            <span className="font-sans text-[0.625rem] uppercase tracking-[0.16em] text-muted">
              {relativeTime(`${last.day}T12:00:00`)}
            </span>
          )}
        </div>
        {last ? (
          <PolaroidImage
            path={last.image_path}
            className="aspect-square w-full rounded-none"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
            <Camera className="h-6 w-6 text-gold/70" strokeWidth={1.5} />
            <span className="font-sans text-xs">Take your first photo</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
