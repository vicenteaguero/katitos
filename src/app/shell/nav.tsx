import { useState } from 'react';
import { NavLink } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { Home, BookHeart, Camera, StickyNote, LayoutGrid } from 'lucide-react';
import { cn } from '@kernel/lib';
import { useMyTodayPolaroid } from '@features/polaroid';
import { MoreDrawer } from './more-drawer';

function NavTab({
  active,
  icon: Icon,
  label,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5',
        'min-h-[44px] font-sans transition-colors duration-200',
        active ? 'text-gold' : 'text-muted'
      )}
    >
      <Icon
        size={22}
        strokeWidth={1.75}
        // Active vs inactive is a pure COLOUR change (gold vs muted) — the same
        // outline either way, so the glyph never morphs into a filled blob.
        className={cn(
          'transition-colors duration-200',
          active ? 'text-gold' : 'text-muted'
        )}
      />
      {/* Every tab is always named — no guessing which glyph is which. */}
      <span className="max-w-16 truncate text-[0.625rem] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
    </span>
  );
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  // No portrait taken today → invite it with a magical, twinkling beacon.
  // It follows YOUR day, not the couple's: apart, our "todays" are 11 hours
  // out of step, and the nudge belongs to whoever still owes a photo.
  const { mine, isLoading } = useMyTodayPolaroid();
  // Un-gated on purpose. Hiding this inside /polaroid meant the one screen
  // showing it was the screen you'd already opened — the reminder never
  // reminded anyone. Now it twinkles wherever you are, until you've posted.
  const needsPhoto = !isLoading && !mine;

  return (
    <>
      {/* Borderless bar: tone separation (surface-2) + a soft top shadow.
          The safe-area inset lives INSIDE the bar's own background, so the
          bottom of the screen is always filled with nav color — never empty. */}
      <nav className="relative z-30 shrink-0 bg-surface-2 pt-[5px] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_-16px_rgba(0,0,0,0.6)]">
        {/* Items in a centered, capped row so they cluster rather than stretch
            edge-to-edge; the bar's background still spans the full width. */}
        <div className="mx-auto flex w-full max-w-[21rem] items-stretch">
          <NavLink to="/" end className="flex flex-1 lift-press">
            {({ isActive }) => (
              <NavTab active={isActive} icon={Home} label="Home" />
            )}
          </NavLink>

          <NavLink to="/album" className="flex flex-1 lift-press">
            {({ isActive }) => (
              <NavTab active={isActive} icon={BookHeart} label="Albums" />
            )}
          </NavLink>

          {/* Raised central Polaroid camera button — wine on white, gently
            overlapping the bar. */}
          <div className="relative flex w-16 shrink-0 items-stretch justify-center">
            {needsPhoto && (
              <span className="photo-beacon" aria-hidden="true">
                <i className="photo-spark photo-spark--1">✦</i>
                <i className="photo-spark photo-spark--2">✦</i>
                <i className="photo-spark photo-spark--3">✦</i>
              </span>
            )}
            <NavLink
              to="/polaroid?shoot=1"
              aria-label="Take a photo"
              className={cn(
                'lift-press absolute -top-5 z-[1] flex h-14 w-14 flex-col items-center justify-center gap-0.5',
                'rounded-full bg-accent text-accent-fg shadow-loge transition-shadow duration-200'
              )}
            >
              <Camera size={22} strokeWidth={1.75} />
              <span className="font-sans text-[0.5rem] font-bold uppercase tracking-[0.12em]">
                Photo
              </span>
            </NavLink>
          </div>

          <NavLink to="/wall" className="flex flex-1 lift-press">
            {({ isActive }) => (
              <NavTab active={isActive} icon={StickyNote} label="Wall" />
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 lift-press"
          >
            <NavTab active={false} icon={LayoutGrid} label="More" />
          </button>
        </div>
      </nav>

      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
