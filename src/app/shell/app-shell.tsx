import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { useEnsurePushSubscription } from '@kernel/push';
import { IconButton, LoadingScreen } from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { KatitosMark } from './katitos-mark';
import { BottomNav } from './nav';
import { CacheWarmer } from './cache-warmer';
import { featureRegistry } from '../features.registry';

/** The name of the screen we're on — drives the quiet top-bar title. */
function sectionTitle(pathname: string): string {
  if (pathname === '/') return '';
  if (pathname.startsWith('/settings')) return 'Settings';
  const seg = '/' + (pathname.split('/')[1] ?? '');
  return featureRegistry.all.find((f) => f.basePath === seg)?.title ?? '';
}

function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // "Back" earns its place only off the home tab — on home it'd go nowhere.
  const atHome = pathname === '/';
  const title = sectionTitle(pathname);

  return (
    <header className="z-20 shrink-0 bg-surface/95 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
      {/* Minimal marquee: (back) · small mark + quiet section name · settings. */}
      <div className="flex items-center justify-between gap-2 px-[1.5rem] py-2">
        <div className="flex min-w-0 items-center gap-2">
          {atHome ? (
            <Link to="/" aria-label="Home" className="flex items-center gap-2">
              <KatitosMark size={24} />
              <PartnerStatusDot />
            </Link>
          ) : (
            <>
              <IconButton
                label="Back"
                className="h-9 w-9"
                onClick={() =>
                  window.history.length > 1 ? navigate(-1) : navigate('/')
                }
              >
                <ArrowLeft className="h-5 w-5" />
              </IconButton>
              <span className="truncate font-sans text-base font-semibold tracking-tight text-fg">
                {title}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <DevUserSwitcher />
          <Link to="/settings">
            <IconButton label="Settings" className="h-9 w-9">
              <Settings className="h-5 w-5" />
            </IconButton>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  const { status } = useAuth();
  // Heal this device's push subscription on every launch (no prompt) so loves
  // keep landing as real notifications even after the browser rotates it.
  useEnsurePushSubscription();

  if (status === 'loading') return <LoadingScreen label="Loading our place…" />;
  if (status === 'anon') return <LoginScreen />;

  // App-shell: a fixed-height column where ONLY <main> scrolls, so the top bar
  // and bottom nav are ALWAYS visible (native-PWA feel — no position:fixed nav
  // that iOS standalone detaches on scroll).
  return (
    <div className="mx-auto flex h-[var(--app-height)] max-w-app flex-col overflow-hidden bg-surface">
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
