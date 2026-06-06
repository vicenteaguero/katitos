import { Link, Outlet } from 'react-router';
import { Settings } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { IconButton, LoadingScreen } from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { BottomNav } from './nav';

function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-lg font-bold text-accent"
      >
        Katitos
        <PartnerStatusDot />
      </Link>
      <div className="flex items-center gap-1">
        <DevUserSwitcher />
        <Link to="/settings">
          <IconButton label="Settings">
            <Settings className="h-5 w-5" />
          </IconButton>
        </Link>
      </div>
    </header>
  );
}

export function AppShell() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen label="Loading our place…" />;
  if (status === 'anon') return <LoginScreen />;

  return (
    <div className="mx-auto flex min-h-full max-w-app flex-col">
      <PresenceTracker />
      <TopBar />
      <main className="flex-1 px-4 pb-24 pt-3">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
