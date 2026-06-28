import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { useEnsurePushSubscription } from '@kernel/push';
import { IconButton } from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { ExchangeIcon } from '@features/currency';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { KatitosMark } from './katitos-mark';
import { BottomNav } from './nav';
import { CacheWarmer } from './cache-warmer';
import { SplashScreen } from './splash-screen';
import { LoveBurst } from './love-burst';
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
          {/* Home corner = the fast lane to the currency converter. Settings
              lives only in the More drawer now. */}
          {atHome && (
            <Link
              to="/currency"
              aria-label="Currency"
              className="lift-press flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
              style={{ border: '1px solid rgba(228,195,106,.4)' }}
            >
              <ExchangeIcon size={18} />
            </Link>
          )}
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

  const loading = status === 'loading';

  // App-shell: full-height flex column (sized off the html/body/#root height:100%
  // chain — the one measurement iOS standalone resolves reliably) where ONLY
  // <main> scrolls, so the top bar + bottom nav stay put. (Ionic/Framework7 use
  // this same pattern; viewport units and JS height-pinning were both unreliable
  // here — the real fix was the opaque status bar, see index.html.)
  return (
    <>
      {status === 'anon' && <LoginScreen />}
      {status === 'authed' && (
        <div className="mx-auto flex h-full max-w-app flex-col overflow-hidden bg-surface">
          <PresenceTracker />
          <CacheWarmer />
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[1.75rem] pb-8 pt-[1.75rem] [-webkit-overflow-scrolling:touch]">
            <Outlet />
          </main>
          <BottomNav />
          <LoveBurst />
        </div>
      )}
      <SplashScreen active={loading} />
    </>
  );
}
