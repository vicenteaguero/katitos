import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import { Settings, Lock } from 'lucide-react';
import { Sheet } from '@kernel/ui';
import { featureRegistry } from '../features.registry';
import { SOON } from '../soon';

/** Drawer section order; anything untagged falls into 'More'. */
const CATEGORY_ORDER = ['Utilities', 'Play', 'Memories', 'Pololos'];

/** A drawer tile: icon + name, sized for a two-up grid. No borders. */
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
  // Locked = shipped-but-not-open: a quiet, inert tile with just a padlock.
  if (locked) {
    return (
      <div
        style={{ '--i': index } as React.CSSProperties}
        aria-disabled="true"
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 opacity-40"
      >
        <Icon className="h-5 w-5 shrink-0 stroke-[1.75] text-muted" />
        <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-muted">
          {label}
        </span>
        <Lock
          size={13}
          strokeWidth={1.75}
          className="shrink-0 text-muted"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={{ '--i': index } as React.CSSProperties}
      className="lift-press flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors duration-150 hover:bg-fg/5 active:bg-fg/10"
    >
      <Icon className="h-5 w-5 shrink-0 stroke-[1.75] text-gold" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-fg">
        {label}
      </span>
    </NavLink>
  );
}

/**
 * The "More" drawer — every feature that is not on the bar.
 *
 * Shared by the phone's bottom bar and the desk's side rail, so the shelf is
 * the same shelf whichever one opened it.
 */
export function MoreDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const entries = featureRegistry.navEntries;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="More"
      size="half"
      headerAction={
        <NavLink
          to="/settings"
          onClick={() => onClose()}
          aria-label="Settings"
          className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gold shadow-[inset_0_0_0_1px_rgba(228,195,106,0.3)] active:text-accent"
        >
          <Settings className="h-4 w-4" />
        </NavLink>
      }
    >
      {/* Open features all sit together at the top — the live app, one tap
            away. The "Soon" rows keep their categories beneath. No tiles, no
            borders; tone + spacing separate, a running --i staggers rows. */}
      <div className="curtain-stagger flex flex-col gap-4 pb-2">
        {(() => {
          const open = entries.filter((e) => !e.locked);
          // Shipped-but-locked features, plus the ideas that have no code at
          // all yet (see soon.ts) — both read the same on the shelf.
          const locked = [
            ...entries.filter((e) => e.locked),
            ...SOON.map((e) => ({ ...e, locked: true })),
          ].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

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
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {open.map((e) => (
                      <DrawerRow
                        key={e.to}
                        to={e.to}
                        icon={e.icon}
                        label={e.label}
                        index={row++}
                        onClick={() => onClose()}
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
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {groups.get(cat)!.map((e) => (
                        <DrawerRow
                          key={e.to}
                          to={e.to}
                          icon={e.icon}
                          label={e.label}
                          index={row++}
                          locked
                          onClick={() => onClose()}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </>
          );
        })()}
      </div>
    </Sheet>
  );
}
