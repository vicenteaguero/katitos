import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Plane,
  Camera,
  StickyNote,
  LayoutGrid,
  Settings,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Sheet } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { featureRegistry } from '../features.registry';

/** Drawer section order; anything untagged falls into 'More'. */
const CATEGORY_ORDER = ['Play', 'Memories', 'Us', 'Practical'];

/** Full-width drawer row: icon + name + chevron. No borders, no tiles. */
function DrawerRow({
  to,
  icon: Icon,
  label,
  index,
  locked = false,
  onClick,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  index: number;
  locked?: boolean;
  onClick: () => void;
}) {
  // Locked = shipped-but-not-open: a quiet, inert row. No link, no press, just
  // a padlock and a muted "Soon" so the couple sees what's coming.
  if (locked) {
    return (
      <div
        style={{ '--i': index } as React.CSSProperties}
        aria-disabled="true"
        className="flex w-full items-center gap-4 rounded px-3 py-3 opacity-40"
      >
        <Icon className="h-5 w-5 shrink-0 stroke-[1.75] text-muted" />
        <span className="min-w-0 flex-1 truncate text-left font-sans text-sm font-semibold text-muted">
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Soon
          <Lock size={13} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={{ '--i': index } as React.CSSProperties}
      className="lift-press flex w-full items-center gap-4 rounded px-3 py-3 transition-colors duration-150 hover:bg-fg/5 active:bg-fg/10"
    >
      <Icon className="h-5 w-5 shrink-0 stroke-[1.75] text-gold" />
      <span className="min-w-0 flex-1 truncate text-left font-sans text-sm font-semibold text-fg">
        {label}
      </span>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-muted"
        aria-hidden="true"
      />
    </NavLink>
  );
}

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
        fill={active ? 'currentColor' : 'none'}
        className={cn(
          'transition-colors duration-200',
          active ? 'text-accent' : 'text-muted'
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
  const location = useLocation();
  const entries = featureRegistry.navEntries;
  const polaroidActive = location.pathname.startsWith('/polaroid');

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

          <NavLink to="/summer" className="flex flex-1 lift-press">
            {({ isActive }) => (
              <NavTab active={isActive} icon={Plane} label="Summer" />
            )}
          </NavLink>

          {/* Raised central Polaroid camera button — wine on white, gently
            overlapping the bar. */}
          <div className="relative flex w-16 shrink-0 items-stretch justify-center">
            <NavLink
              to="/polaroid?shoot=1"
              aria-label="Take a photo"
              className={cn(
                'lift-press absolute -top-5 flex h-14 w-14 flex-col items-center justify-center gap-0.5',
                'rounded-full bg-accent text-accent-fg shadow-loge transition-shadow duration-200',
                polaroidActive && 'ring-2 ring-gold/40'
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

      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        size="half"
      >
        {/* Open features all sit together at the top — the live app, one tap
            away. The "Soon" rows keep their categories beneath. No tiles, no
            borders; tone + spacing separate, a running --i staggers rows. */}
        <div className="curtain-stagger flex flex-col gap-4 pb-2">
          {(() => {
            const open = entries.filter((e) => !e.locked);
            const locked = entries.filter((e) => e.locked);

            // Locked rows grouped by category (categories exist only here now).
            const groups = new Map<string, typeof entries>();
            for (const e of locked) {
              const cat = e.category ?? 'More';
              const g = groups.get(cat);
              if (g) g.push(e);
              else groups.set(cat, [e]);
            }
            const order = [
              ...CATEGORY_ORDER,
              ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
            ];
            let row = 0;
            return (
              <>
                {open.length > 0 && (
                  <section>
                    <p className="mb-1.5 px-3 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-gold/80">
                      Open
                    </p>
                    <div className="flex flex-col">
                      {open.map((e) => (
                        <DrawerRow
                          key={e.to}
                          to={e.to}
                          icon={e.icon}
                          label={e.label}
                          index={row++}
                          onClick={() => setMoreOpen(false)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {order
                  .filter((cat) => groups.has(cat))
                  .map((cat) => (
                    <section key={cat}>
                      <p className="mb-1.5 px-3 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted">
                        {cat}
                      </p>
                      <div className="flex flex-col">
                        {groups.get(cat)!.map((e) => (
                          <DrawerRow
                            key={e.to}
                            to={e.to}
                            icon={e.icon}
                            label={e.label}
                            index={row++}
                            locked
                            onClick={() => setMoreOpen(false)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
              </>
            );
          })()}
          <DrawerRow
            to="/settings"
            icon={Settings}
            label="Settings"
            index={entries.length}
            onClick={() => setMoreOpen(false)}
          />
        </div>
      </Sheet>
    </>
  );
}
