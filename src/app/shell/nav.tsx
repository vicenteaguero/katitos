import { useState } from 'react';
import { NavLink } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { Home, BookHeart, StickyNote, LayoutGrid } from 'lucide-react';
import { cn } from '@kernel/lib';
import { MoreDrawer } from './more-drawer';
import { PhotoButton } from './photo-button';

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

          {/* The raised centre button. It is the daily habit, so it says which
            of the three things is true rather than always saying "Photo" —
            un-gated, on every screen, because the one place a reminder is
            useless is the screen you already opened. */}
          <PhotoButton />

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
