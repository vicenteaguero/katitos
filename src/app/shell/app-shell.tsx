import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { IconButton, LoadingScreen } from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { KatitosMark } from './katitos-mark';
import { BottomNav } from './nav';
import { CacheWarmer } from './cache-warmer';

function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // "Back" earns its place only off the home tab — on home it'd go nowhere.
  // Always lands somewhere sane: history if we have it, else home.
  const atHome = pathname === '/';

  return (
    <header className="z-20 shrink-0 bg-surface/95 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
      {/* The marquee: (back) + brand mark + gilt wordmark + partner status dot. */}
      <div className="flex items-center justify-between gap-2 px-[1.75rem] py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {!atHome && (
            <IconButton
              label="Back"
              onClick={() =>
                window.history.length > 1 ? navigate(-1) : navigate('/')
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          )}
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <KatitosMark size={30} />
            <span className="font-display gilt-text truncate text-2xl font-semibold leading-none tracking-tight">
              Katitos
            </span>
            <PartnerStatusDot className="ml-0.5" />
          </Link>
        </div>
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

  // App-shell: a fixed-height column where ONLY <main> scrolls, so the top bar
  // and bottom nav are ALWAYS visible (native-PWA feel — no position:fixed nav
  // that iOS standalone detaches on scroll).
  return (
    <div className="mx-auto flex h-[100dvh] max-w-app flex-col overflow-hidden bg-surface">
      <PresenceTracker />
      <CacheWarmer />
      <TopBar />
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[1.75rem] pb-8 pt-[1.75rem] [-webkit-overflow-scrolling:touch]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
