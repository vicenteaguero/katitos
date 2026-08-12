import { useMemo } from 'react';
import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { usePolaroids } from '../api/polaroid.queries';
import { groupByDay } from '../lib/polaroid-days';
import { PolaroidImage } from '../components/polaroid-image';
import type { Polaroid } from '../types';
import '../polaroid.css';

/**
 * Home: the most recent day of us, on cream stock inside a wine frame.
 *
 * The pair lies overlapped exactly as it does on the Polaroid screen, with your
 * love's photo on top — the same object in both places, so Home reads as a
 * glimpse of that screen rather than a different arrangement of the same data.
 * The whole card is a link, so nothing here is tappable on its own.
 */
export function LastPolaroidWidget() {
  const { self, partner } = usePartner();
  const { data } = usePolaroids();

  const day = useMemo(() => {
    const days = groupByDay(data ?? [], self?.user_id ?? null);
    return days[0] ?? null;
  }, [data, self?.user_id]);

  const plates = day
    ? [day.shared, day.mine, day.theirs, ...day.extras].filter(
        (p): p is NonNullable<typeof p> => p != null
      )
    : [];

  const { data: urls } = useSignedUrls(
    BUCKETS.polaroids,
    plates.map((p) => p.image_path)
  );

  const partnerName = partner?.role === 'a' ? 'Katito' : 'Katita';
  const pair = !!day?.mine && !!day?.theirs;

  return (
    <Link
      to="/polaroid"
      className="lift-press block rounded-[28px] p-[18px] text-left"
      style={{
        border: '1px solid rgba(201,162,75,.26)',
        background: 'linear-gradient(160deg, #221019, #180b13)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[1.37rem] font-semibold text-fg">
          Our last Polaroid ❤️
        </span>
        {day && (
          <span className="font-sans text-[10px] uppercase tracking-[0.13em] text-muted">
            {DateTime.fromISO(day.day).toFormat('ccc, LLL d')}
          </span>
        )}
      </div>

      {plates.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 py-8 text-center text-muted">
          <Camera className="h-6 w-6 text-gold/70" strokeWidth={1.5} />
          <span className="font-sans text-xs">Take your first photo</span>
        </div>
      ) : pair ? (
        // Overlapped, theirs in front — the same geometry as the Polaroid page.
        <div className="mt-3.5 flex justify-center">
          <MiniPlate
            photo={day!.mine!}
            url={urls?.get(day!.mine!.image_path)}
            label="You"
            side="mine"
          />
          <MiniPlate
            photo={day!.theirs!}
            url={urls?.get(day!.theirs!.image_path)}
            label={partnerName}
            side="theirs"
          />
        </div>
      ) : (
        <div
          className="mt-3.5 rounded-[10px] bg-[#f3ebdd] px-2.5 pb-3.5 pt-2.5"
          style={{ boxShadow: '0 14px 30px -16px rgba(0,0,0,.7)' }}
        >
          <PolaroidImage
            path={plates[0].image_path}
            src={urls?.get(plates[0].image_path)}
            className="aspect-square w-full"
          />
          {plates[0].caption && (
            <p className="m-0 mt-3 text-center font-display text-[19px] italic text-[#6E1423]">
              {plates[0].caption}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

/** One half of the overlapped pair, sized for the Home card. */
function MiniPlate({
  photo,
  url,
  label,
  side,
}: {
  photo: Polaroid;
  url?: string;
  label: string;
  side: 'mine' | 'theirs';
}) {
  const mine = side === 'mine';
  return (
    <span
      className={`pair-plate block w-[62%] shrink-0 rounded-[10px] bg-[#f3ebdd] px-2 pb-3 pt-2 ${
        mine ? 'pair-plate--back' : '-ml-[24%] pair-plate--front'
      }`}
      style={
        {
          '--rest-rotate': mine ? '-5deg' : '4deg',
          '--push': mine ? '-6px' : '6px',
          boxShadow: '0 14px 30px -16px rgba(0,0,0,.7)',
        } as React.CSSProperties
      }
    >
      <PolaroidImage
        path={photo.image_path}
        src={url}
        className="aspect-square w-full"
      />
      <span className="mt-2 block truncate text-center font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a5f34]">
        {label}
      </span>
    </span>
  );
}
