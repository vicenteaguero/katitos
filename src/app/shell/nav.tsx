import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { ComponentType } from 'react';
import { Home, LayoutGrid, Settings } from 'lucide-react';
import { Sheet } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { featureRegistry } from '../features.registry';

type NavIcon = ComponentType<{ className?: string }>;

const PRIMARY_LIMIT = 3;

function NavItem({
  active,
  icon: Icon,
  label,
}: {
  active: boolean;
  icon: NavIcon;
  label: string;
}) {
  return (
    <span
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5',
        'min-h-[44px] font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em]',
        'transition-colors duration-200',
        active ? 'text-gold' : 'text-muted'
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 transition-colors duration-200',
          active ? 'text-accent' : 'text-muted'
        )}
      />
      <span className="max-w-16 truncate">{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="draw-rule absolute inset-x-3 top-0 h-px"
          style={{ background: 'var(--grad-gilt)' }}
        />
      )}
    </span>
  );
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const entries = featureRegistry.navEntries;
  const primary = entries
    .filter((e) => e.placement === 'primary')
    .slice(0, PRIMARY_LIMIT);

  return (
    <>
      <nav className="velvet-2 gilt-hairline-flat fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app items-stretch rounded-none border-x-0 border-b-0 border-t pb-[env(safe-area-inset-bottom)] shadow-loge backdrop-blur">
        <NavLink to="/" end className="flex flex-1 lift-press">
          {({ isActive }) => (
            <NavItem active={isActive} icon={Home} label="Home" />
          )}
        </NavLink>

        {primary.map((e) => {
          const Icon = e.icon;
          const active = location.pathname.startsWith(e.to);
          return (
            <NavLink key={e.to} to={e.to} className="flex flex-1 lift-press">
              <NavItem active={active} icon={Icon} label={e.label} />
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 lift-press"
        >
          <NavItem active={false} icon={LayoutGrid} label="More" />
        </button>
      </nav>

      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="The Program"
      >
        <p className="eyebrow mb-7">The Repertoire</p>
        <div className="curtain-stagger grid grid-cols-3 gap-3.5 pb-2">
          {entries.map((e, i) => {
            const Icon = e.icon;
            return (
              <NavLink
                key={e.to}
                to={e.to}
                onClick={() => setMoreOpen(false)}
                style={{ '--i': i } as React.CSSProperties}
                className="velvet gilt-hairline-flat lift-press flex flex-col items-center gap-2 rounded-none p-4 text-center"
              >
                <Icon className="h-6 w-6 text-gold" />
                <span className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-fg truncate max-w-full">
                  {e.label}
                </span>
              </NavLink>
            );
          })}
          <NavLink
            to="/settings"
            onClick={() => setMoreOpen(false)}
            style={{ '--i': entries.length } as React.CSSProperties}
            className="velvet gilt-hairline-flat lift-press flex flex-col items-center gap-2 rounded-none p-4 text-center"
          >
            <Settings className="h-6 w-6 text-gold" aria-hidden="true" />
            <span className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-fg">
              Settings
            </span>
          </NavLink>
        </div>
      </Sheet>
    </>
  );
}
