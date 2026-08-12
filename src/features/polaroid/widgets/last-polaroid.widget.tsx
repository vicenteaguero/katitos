import { useMemo } from 'react';
import { Link } from 'react-router';
import { Camera } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { usePolaroids } from '../api/polaroid.queries';
import { groupByDay } from '../lib/polaroid-days';
import { PolaroidImage } from '../components/polaroid-image';

/**
 * Home: the most recent day of us, on cream stock inside a wine frame.
 *
 * Shows the PAIR when the day has one — that's the whole feeling the feature
 * is for: two photos of the same date, leaning together. A day with only one
 * photo shows just that one, at full width, exactly as it always did.
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
          {plates.length > 1 ? 'Our last day' : 'Last polaroid'}
        </span>
        {day && (
          <span className="font-sans text-[10px] uppercase tracking-[0.13em] text-muted">
            {DateTime.fromISO(day.day).toFormat('ccc, LLL d')}
          </span>
        )}
      </div>

      {plates.length > 0 ? (
        <div
          className={
            plates.length > 1
              ? 'mt-3.5 flex items-start gap-2'
              : 'mt-3.5 rounded-[10px] bg-[#f3ebdd] px-2.5 pb-3.5 pt-2.5'
          }
          style={
            plates.length > 1
              ? undefined
              : { boxShadow: '0 14px 30px -16px rgba(0,0,0,.7)' }
          }
        >
          {plates.length > 1 ? (
            plates.slice(0, 2).map((p, i) => (
              <span
                key={p.id}
                className="block min-w-0 flex-1 rounded-[10px] bg-[#f3ebdd] px-2 pb-3 pt-2"
                style={{
                  boxShadow: '0 14px 30px -16px rgba(0,0,0,.7)',
                  transform: `rotate(${i === 0 ? -3 : 2.5}deg)`,
                }}
              >
                <PolaroidImage
                  path={p.image_path}
                  src={urls?.get(p.image_path)}
                  className="aspect-square w-full"
                />
                <span className="mt-2 block truncate text-center font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a5f34]">
                  {p.user_id === self?.user_id ? 'You' : partnerName}
                </span>
              </span>
            ))
          ) : (
            <>
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
            </>
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
