import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useMyTodayPolaroid } from '../api/use-my-today';
import { PolaroidImage } from '../components/polaroid-image';

export function TodayPolaroidWidget() {
  const { mine } = useMyTodayPolaroid();
  return (
    <Link to="/polaroid" className="block h-full">
      <Card className="lift-press flex h-full flex-col gap-3">
        <CardTitle className="text-xl">Today</CardTitle>
        {mine ? (
          // The day's photo — softly rounded inside its gilt frame.
          <PolaroidImage
            path={mine.image_path}
            className="aspect-square w-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-5 text-center text-muted">
            <Camera className="h-6 w-6 text-gold/70" strokeWidth={1.5} />
            <span className="font-sans text-xs">Take today&apos;s photo</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
