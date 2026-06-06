import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useTodayPolaroid } from '../api/polaroid.queries';
import { PolaroidImage } from '../components/polaroid-image';

export function TodayPolaroidWidget() {
  const { data } = useTodayPolaroid();
  return (
    <Link to="/polaroid">
      <Card className="h-full">
        <CardTitle>Today</CardTitle>
        {data ? (
          <PolaroidImage
            path={data.image_path}
            className="mt-1 aspect-square w-full rounded object-cover"
          />
        ) : (
          <div className="mt-2 flex flex-col items-center gap-1 py-3 text-muted">
            <Camera className="h-6 w-6" />
            <span className="text-xs">Take today's photo</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
