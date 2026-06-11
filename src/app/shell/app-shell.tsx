import { Link, Outlet } from 'react-router';
import { Settings } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { IconButton, LoadingScreen } from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { KatitosMark } from './katitos-mark';
import { BottomNav } from './nav';

function TopBar() {
  return (
    <header className="sticky top-0 z-20 bg-surface/95 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
      {/* The marquee: brand mark + gilt wordmark + partner status dot. */}
      <div className="flex items-center justify-between gap-2 px-[1.75rem] py-2.5">
        <Link to="/" className="group flex items-center gap-2.5">
          <KatitosMark size={30} />
          <span className="font-display gilt-text text-2xl font-semibold leading-none tracking-tight">
            Katitos
          </span>
          <PartnerStatusDot className="ml-0.5" />
        </Link>
        <div className="flex items-center gap-1">
          <DevUserSwitcher />
          <Link to="/settings">
            <IconButton label="Settings">
              <Settings className="h-5 w-5" />
            </IconButton>
          </Link>
        </div>
      </div>
      {/* A thin gold-stitched seam under the bar. */}
      <hr className="seam" />
    </header>
  );
}

export function AppShell() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen label="Loading our place…" />;
  if (status === 'anon') return <LoginScreen />;

  return (
    <div className="gilt-hairline velvet mx-auto flex min-h-full max-w-app flex-col">
      <PresenceTracker />
      <TopBar />
      <main className="flex-1 px-[1.75rem] pb-24 pt-[1.75rem]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
