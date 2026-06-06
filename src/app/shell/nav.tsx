import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Home, LayoutGrid, Settings } from 'lucide-react';
import { Sheet } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { featureRegistry } from '../features.registry';

const PRIMARY_LIMIT = 3;

function navItemClass(active: boolean): string {
  return cn(
    'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs',
    active ? 'text-accent' : 'text-muted'
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
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app items-stretch border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <NavLink
          to="/"
          end
          className={({ isActive }) => navItemClass(isActive)}
        >
          <Home className="h-5 w-5" />
          Home
        </NavLink>

        {primary.map((e) => {
          const Icon = e.icon;
          const active = location.pathname.startsWith(e.to);
          return (
            <NavLink key={e.to} to={e.to} className={navItemClass(active)}>
              <Icon className="h-5 w-5" />
              <span className="max-w-16 truncate">{e.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={navItemClass(false)}
        >
          <LayoutGrid className="h-5 w-5" />
          More
        </button>
      </nav>

      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Everything"
      >
        <div className="grid grid-cols-3 gap-3 pb-2">
          {entries.map((e) => {
            const Icon = e.icon;
            return (
              <NavLink
                key={e.to}
                to={e.to}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-3 text-center text-xs text-fg"
              >
                <Icon className="h-6 w-6 text-accent" />
                <span className="truncate">{e.label}</span>
              </NavLink>
            );
          })}
          <NavLink
            to="/settings"
            onClick={() => setMoreOpen(false)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-3 text-center text-xs text-fg"
          >
            <Settings className="h-6 w-6 text-accent" />
            <span>Settings</span>
          </NavLink>
        </div>
      </Sheet>
    </>
  );
}
