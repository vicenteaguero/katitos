import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Heart } from 'lucide-react';
import { cn } from '@kernel/lib';
import { usePolaroidDraft, usePolaroidNudge } from '@features/polaroid';

/**
 * The raised button in the middle of the bar — the one thing in this app that
 * gets used every single day.
 *
 * It answers one question at a glance: is my photo in? Three states, never
 * hidden, always tappable:
 *
 *   shoot   wine, camera, twinkling. Tapping opens the PHONE's camera.
 *   rescue  glossy green, a full heart, and a slow tug — today is done, but the
 *           day borrowed from the other clock is still empty and closing.
 *           Tapping goes straight to that day's upload.
 *   done    grey, a full heart, perfectly still. Nothing until tomorrow.
 *
 * The camera is the system one, via `<input capture>`. That is the entire
 * reason this component owns an input instead of linking to `?shoot=1`: an
 * installed PWA on iOS re-asks for camera permission on every cold launch of
 * `getUserMedia`, so the photo taken every day of the year is the one that must
 * never go through it. The file it gets is handed to the Polaroid screen
 * through the draft store, because a File cannot travel in a URL.
 */
/** `raised`: the bar's version hangs out of its slot; the rail's sits flat. */
export function PhotoButton({ raised = true }: { raised?: boolean } = {}) {
  const navigate = useNavigate();
  const { state, today, rescueDay, isLoading } = usePolaroidNudge();
  const setDraft = usePolaroidDraft((s) => s.setDraft);
  const inputRef = useRef<HTMLInputElement>(null);

  // Until the answer is in, look like the neutral "take one" button but stay
  // quiet — a beacon that twinkles and then vanishes reads as a glitch.
  const settled = !isLoading;
  const done = settled && state === 'done';
  const rescue = settled && state === 'rescue';

  const openCamera = useCallback(() => inputRef.current?.click(), []);

  const tap = () => {
    if (rescue && rescueDay) navigate(`/polaroid?catchup=${rescueDay}`);
    else if (done) navigate('/polaroid');
    else openCamera();
  };

  const label = rescue
    ? `Add the photo for ${rescueDay} before that day closes`
    : done
      ? 'Your photo is in — open the Polaroid album'
      : "Take today's photo";

  return (
    <div
      className={cn(
        'relative flex shrink-0 justify-center',
        raised ? 'w-16 items-stretch' : 'w-14 items-center'
      )}
    >
      {settled && state === 'shoot' && (
        <span className="photo-beacon" aria-hidden="true">
          <i className="photo-spark photo-spark--1">✦</i>
          <i className="photo-spark photo-spark--2">✦</i>
          <i className="photo-spark photo-spark--3">✦</i>
        </span>
      )}

      <button
        type="button"
        onClick={tap}
        aria-label={label}
        className={cn(
          'lift-press flex h-14 w-14 flex-col items-center justify-center gap-0.5',
          raised ? 'absolute -top-5 z-[1]' : 'relative',
          'rounded-full transition-colors duration-300',
          done
            ? 'photo-btn--done'
            : rescue
              ? 'photo-btn--rescue shadow-loge'
              : 'bg-accent text-accent-fg shadow-loge'
        )}
      >
        {done || rescue ? (
          <Heart size={22} strokeWidth={1.75} fill="currentColor" />
        ) : (
          <Camera size={22} strokeWidth={1.75} />
        )}
        <span className="font-sans text-[0.5rem] font-bold uppercase tracking-[0.12em]">
          {rescue ? '1 more' : done ? 'Done' : 'Photo'}
        </span>
        {/* A single gold pip: something is still waiting, and it has a deadline. */}
        {rescue && <i className="photo-pip" aria-hidden="true" />}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setDraft({ day: today, file });
          navigate('/polaroid');
        }}
      />
    </div>
  );
}
