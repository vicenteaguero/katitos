import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { relativeTime } from '@kernel/lib';
import { usePolaroids } from '../api/polaroid.queries';
import { PolaroidImage } from '../components/polaroid-image';

/**
 * Home: our most recent polaroid on its cream stock, framed in wine. Falls back
 * to a gentle prompt to take the first photo when the shoebox is still empty.
 */
export function LastPolaroidWidget() {
  const { data } = usePolaroids();
  const last = data?.[0];

  return (
    <Link
      to="/polaroid"
      className="lift-press block rounded p-[18px] text-left"
      style={{
        border: '1px solid rgba(201,162,75,.26)',
        background: 'linear-gradient(160deg, #221019, #180b13)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[1.37rem] font-semibold text-fg">
          Last polaroid
        </span>
        {last && (
          <span className="font-sans text-[10px] uppercase tracking-[0.13em] text-muted">
            {relativeTime(`${last.day}T12:00:00`)}
          </span>
        )}
      </div>
      {last ? (
        <div
          className="mt-3.5 bg-[#f3ebdd] px-2.5 pb-3.5 pt-2.5"
          style={{ boxShadow: '0 14px 30px -16px rgba(0,0,0,.7)' }}
        >
          <PolaroidImage
            path={last.image_path}
            className="aspect-square w-full"
          />
          {last.caption && (
            <p className="m-0 mt-3 text-center font-display text-[19px] italic text-[#6E1423]">
              {last.caption}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-2 py-8 text-center text-muted">
          <Camera className="h-6 w-6 text-gold/70" strokeWidth={1.5} />
          <span className="font-sans text-xs">Take your first photo</span>
        </div>
      )}
    </Link>
  );
}
