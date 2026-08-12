import { useState, type CSSProperties, type ReactNode } from 'react';
import { DateTime } from 'luxon';
import { Camera } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { Polaroid } from '../types';
import { frontOf, type Focus, type PolaroidDay } from '../lib/polaroid-days';
import { PolaroidImage } from './polaroid-image';
import '../polaroid.css';

/**
 * Two instant photos of the same day, one lying on the other.
 *
 * Tap the one behind to bring it forward; tap the one in front to open it full
 * screen. A missing half is never an error — it's a waiting plate with your
 * love's local time on it, because for eleven hours a day their tomorrow
 * hasn't happened yet.
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
  // Theirs on top until told otherwise.
  const [ownFocus, setOwnFocus] = useState<Focus>('theirs');
  const preferred = controlledFocus ?? ownFocus;
  const front = frontOf(day, preferred);

  const bring = (side: Focus) => {
    if (onFocusChange) onFocusChange(side);
    else setOwnFocus(side);
  };

  /** Behind → come forward. In front → open it. */
  const tap = (side: Focus, photo: Polaroid | null) => {
    if (!photo) return;
    if (front === side) onOpen(photo);
    else bring(side);
  };

  return (
    <div className="pair-stage relative mx-auto flex w-full max-w-[22rem] justify-center">
      <PairPlate
        side="mine"
        photo={day.mine}
        url={day.mine ? urls?.get(day.mine.image_path) : undefined}
        label="You"
        front={front === 'mine'}
        onTap={() => tap('mine', day.mine)}
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
        front={front === 'theirs'}
        onTap={() => tap('theirs', day.theirs)}
        empty={
          <EmptyPlate
            title={`${partnerName}'s photo`}
            hint={waitingHint(day.day, partnerZone)}
          />
        }
      />

      {/* Anything that fits neither side still gets shown — never lose a photo. */}
      {day.extras.length > 0 && (
        <div className="absolute -bottom-24 left-0 right-0 flex justify-center gap-2">
          {day.extras.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className="marble lift-press block w-24 rounded-md p-1.5 pb-3 shadow-loge"
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
  front,
  onTap,
  empty,
}: {
  side: Focus;
  photo: Polaroid | null;
  url?: string;
  label: string;
  front: boolean;
  onTap: () => void;
  empty: ReactNode;
}) {
  const mine = side === 'mine';
  // Each plate leans away from the middle when it is behind, and slides
  // outward on its way past the other one.
  const style = {
    '--rest-rotate': mine ? '-5deg' : '4deg',
    '--push': mine ? '-12px' : '12px',
  } as CSSProperties;

  // They overlap: 62% each with a 24% bite taken out of the gap between them.
  const width = cn('w-[62%] shrink-0', !mine && '-ml-[24%]');

  if (!photo) {
    return (
      <div
        className={cn(
          width,
          'pair-plate',
          front ? 'pair-plate--front' : 'pair-plate--back'
        )}
        style={style}
      >
        {empty}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={
        front ? `Open ${label}'s photo` : `Bring ${label}'s photo to the front`
      }
      aria-pressed={front}
      className={cn(
        width,
        'pair-plate marble shadow-loge block rounded-md p-2 pb-3',
        front ? 'pair-plate--front' : 'pair-plate--back'
      )}
      style={style}
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
    'pair-plate--empty block w-full rounded-md p-2 pb-3 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.8)]';

  return onClick ? (
    <button type="button" onClick={onClick} className={cn(shell, 'lift-press')}>
      {inner}
    </button>
  ) : (
    <div className={shell}>{inner}</div>
  );
}
