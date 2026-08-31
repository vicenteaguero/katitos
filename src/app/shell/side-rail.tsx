import { useState } from 'react';
import { NavLink } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  BookHeart,
  Camera,
  StickyNote,
  LayoutGrid,
  Settings,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import { MoreDrawer } from './more-drawer';

function RailItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        cn(
          'lift-press flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-fg/5',
          isActive ? 'text-gold' : 'text-muted'
        )
      }
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-[0.5rem] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
    </NavLink>
  );
}

/**
 * The bottom tab bar, stood on its side.
 *
 * Only ever shown while a desk route is open on a screen with room for one;
 * the phone never sees it. The same five places, the same More shelf.
 */
export function SideRail() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="Main"
        className="flex w-16 shrink-0 flex-col items-center gap-1 bg-surface-2 pb-3 pt-3"
      >
        <RailItem to="/" icon={Home} label="Home" end />
        <RailItem to="/album" icon={BookHeart} label="Albums" />
        <NavLink
          to="/polaroid?shoot=1"
          aria-label="Take a photo"
          title="Take a photo"
          className="lift-press my-1 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
        >
          <Camera size={20} strokeWidth={1.75} />
        </NavLink>
        <RailItem to="/wall" icon={StickyNote} label="Wall" />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          title="More"
          className="lift-press flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-muted transition-colors hover:bg-fg/5"
        >
          <LayoutGrid size={20} strokeWidth={1.75} />
          <span className="text-[0.5rem] font-semibold uppercase tracking-[0.14em]">
            More
          </span>
        </button>
        <div className="mt-auto" />
        <RailItem to="/settings" icon={Settings} label="Settings" />
      </nav>
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
