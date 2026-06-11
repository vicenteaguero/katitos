import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useTodayPolaroid } from '../api/polaroid.queries';
import { PolaroidImage } from '../components/polaroid-image';

export function TodayPolaroidWidget() {
  const { data } = useTodayPolaroid();
  return (
    <Link to="/polaroid" className="block h-full">
      <Card className="lift-press flex h-full flex-col gap-3">
        <CardTitle className="text-xl">Today</CardTitle>
        {data ? (
          // A small instant print pinned to the lobby wall — marble-mounted.
          <figure className="marble gilt-hairline-flat m-0 p-1.5 pb-2.5 shadow-loge">
            <PolaroidImage
              path={data.image_path}
              className="aspect-square w-full"
            />
          </figure>
        ) : (
          <div className="flex flex-col items-center gap-2 py-5 text-center text-muted">
            <Camera className="h-6 w-6 text-copper" strokeWidth={1.5} />
            <span className="font-sans text-xs">Take today's photo</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
