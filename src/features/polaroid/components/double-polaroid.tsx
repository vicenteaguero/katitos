import { useState, type CSSProperties } from 'react';
import { DateTime } from 'luxon';
import { Camera } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { Polaroid } from '../types';
import type { PolaroidDay } from '../lib/polaroid-days';
import { PolaroidImage } from './polaroid-image';
import '../polaroid.css';

/** Which plate is on top. `null` = both resting, side by side. */
export type Focus = 'mine' | 'theirs' | null;

/**
 * Two instant photos of the same day, resting against each other.
 *
 * The point of the feature: one glance says "here is your day and here is
 * mine". Tap either to bring it forward; tap again to let them settle back.
 * A missing half is never an error — it's a waiting plate with your love's
 * local time on it, because for eleven hours a day their tomorrow hasn't
 * happened yet.
 */
export function DoublePolaroid({
  day,
  urls,
  partnerName,
  partnerZone,
  onOpen,
  onShoot,
  stillOpen = false,
  isToday = false,
  focus: controlledFocus,
  onFocusChange,
}: {
  day: PolaroidDay;
  /** Batch-signed thumbnails, keyed by image_path. */
  urls?: Map<string, string>;
  partnerName: string;
  partnerZone: string | null | undefined;
  onOpen: (photo: Polaroid) => void;
  /** Offered on your own empty half, when the day is still open to you. */
  onShoot?: () => void;
  /**
   * This day is still writable for me. True for my today, and ALSO for my
   * love's today while we're on different dates — that day isn't gone, it just
   * hasn't happened here yet.
   */
  stillOpen?: boolean;
  /** This is my own today — the only day the camera can shoot for. */
  isToday?: boolean;
  /** Controlled focus — today's card lifts it so it can edit that caption. */
  focus?: Focus;
  onFocusChange?: (next: Focus) => void;
}) {
  const [ownFocus, setOwnFocus] = useState<Focus>(null);
  const focus = controlledFocus !== undefined ? controlledFocus : ownFocus;

  const tap = (side: Exclude<Focus, null>) => {
    const next: Focus = focus === side ? null : side;
    if (onFocusChange) onFocusChange(next);
    else setOwnFocus(next);
  };

  return (
    <div
      className="pair-stage relative mx-auto w-full max-w-[22rem]"
      style={{ perspective: '1400px' }}
    >
      <div className="flex items-start justify-center gap-2">
        <PairPlate
          side="mine"
          photo={day.mine}
          url={day.mine ? urls?.get(day.mine.image_path) : undefined}
          label="You"
          focus={focus}
          onTap={() => day.mine && tap('mine')}
          onOpen={onOpen}
          empty={
            <EmptyPlate
              title="Your photo"
              // Three different truths, and calling a still-open day "missed"
              // would be the unkind one: while it's already tomorrow where she
              // is, that date is still perfectly fillable from here.
              hint={
                isToday
                  ? "Take today's"
                  : stillOpen
                    ? 'still open — add one'
                    : 'you missed this one'
              }
              icon={isToday || stillOpen}
              onClick={onShoot}
            />
          }
        />
        <PairPlate
          side="theirs"
          photo={day.theirs}
          url={day.theirs ? urls?.get(day.theirs.image_path) : undefined}
          label={partnerName}
          focus={focus}
          onTap={() => day.theirs && tap('theirs')}
          onOpen={onOpen}
          empty={
            <EmptyPlate
              title={`${partnerName}'s photo`}
              hint={waitingHint(day.day, partnerZone)}
            />
          }
        />
      </div>

      {/* Anything that fits neither side still gets shown — never lose a photo. */}
      {day.extras.length > 0 && (
        <div className="mt-3 flex justify-center gap-2">
          {day.extras.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className="marble lift-press block w-28 rounded-md p-1.5 pb-3 shadow-loge"
            >
              <PolaroidImage
                path={p.image_path}
                src={urls?.get(p.image_path)}
                className="aspect-square w-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * "Waiting for her Sunday" reads wrong once it IS her Sunday and she just
 * hasn't posted. So say which of the two it actually is.
 */
function waitingHint(day: string, zone: string | null | undefined): string {
  const theirNow = DateTime.now().setZone(zone ?? 'UTC');
  const theirToday = theirNow.toISODate();
  if (theirToday && day > theirToday) {
    // Their day hasn't started yet — this is the eleven-hour gap, not a lapse.
    return `not this day yet, it's ${theirNow.toFormat('HH:mm')} there`;
  }
  return 'still to come';
}

function PairPlate({
  side,
  photo,
  url,
  label,
  focus,
  onTap,
  onOpen,
  empty,
}: {
  side: Exclude<Focus, null>;
  photo: Polaroid | null;
  url?: string;
  label: string;
  focus: Focus;
  onTap: () => void;
  onOpen: (photo: Polaroid) => void;
  empty: React.ReactNode;
}) {
  const focused = focus === side;
  const dimmed = focus !== null && !focused;
  // A gentle opposing tilt so they lean together like two photos dropped on a
  // table, straightening as one is picked up.
  const rest = side === 'mine' ? -4.5 : 4;

  if (!photo) {
    return <div className="min-w-0 flex-1">{empty}</div>;
  }

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={onTap}
        onDoubleClick={() => onOpen(photo)}
        aria-label={`${label}'s photo`}
        aria-pressed={focused}
        className={cn(
          'pair-plate marble shadow-loge block w-full rounded-md p-2 pb-3',
          focused && 'pair-plate--focused'
        )}
        style={
          {
            '--rest-rotate': `${rest}deg`,
            opacity: dimmed ? 0.55 : 1,
            zIndex: focused ? 2 : 1,
          } as CSSProperties
        }
      >
        <PolaroidImage
          path={photo.image_path}
          src={url}
          className="aspect-square w-full"
        />
        <span className="mt-2 block truncate text-center font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-copper">
          {label}
        </span>
        {photo.caption && (
          <span className="mt-0.5 block truncate px-1 text-center font-display text-sm italic text-brown">
            {photo.caption}
          </span>
        )}
      </button>
      {focused && (
        <button
          type="button"
          onClick={() => onOpen(photo)}
          className="lift-press mt-1.5 block w-full text-center font-sans text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-gold/80"
        >
          Open
        </button>
      )}
    </div>
  );
}

/** The un-taken half: a blank plate in the tray, never a warning. */
function EmptyPlate({
  title,
  hint,
  icon = false,
  onClick,
}: {
  title: string;
  hint: string;
  icon?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.04)] text-center">
        {icon && <Camera className="h-5 w-5 text-gold/60" strokeWidth={1.5} />}
        <span className="px-2 font-sans text-[0.6rem] leading-snug text-muted">
          {hint}
        </span>
      </span>
      <span className="mt-2 block truncate text-center font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted/70">
        {title}
      </span>
    </>
  );

  const shell =
    'pair-plate pair-plate--empty block w-full rounded-md p-2 pb-3 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.8)]';

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(shell, 'lift-press')}
      style={{ '--rest-rotate': '-4.5deg' } as CSSProperties}
    >
      {inner}
    </button>
  ) : (
    <div
      className={shell}
      style={{ '--rest-rotate': '4deg' } as CSSProperties}
      aria-hidden="false"
    >
      {inner}
    </div>
  );
}
