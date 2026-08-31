import { useEffect, useRef } from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@kernel/auth';
import { useEnsurePushSubscription } from '@kernel/push';
import { cn } from '@kernel/lib';
import {
  IconButton,
  KatitosMark,
  TopBarSlotProvider,
  useIsDesk,
  useTopBarSlot,
} from '@kernel/ui';
import { PresenceTracker, PartnerStatusDot } from '@features/presence';
import { ExchangeIcon } from '@features/currency';
import { LoginScreen } from './login';
import { DevUserSwitcher } from './dev-switcher';
import { BottomNav } from './nav';
import { SideRail } from './side-rail';
import { CacheWarmer } from './cache-warmer';
import { SplashScreen } from './splash-screen';
import { LoveBurst } from './love-burst';
import { NotificationPrompt } from './notification-prompt';
import { ChangelogModal } from './changelog-modal';
import { PendingPill } from './pending-pill';
import { useAnnounceRelease } from './use-announce-release';
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
  // A control the active route can inject (wall's edit pen, currency freshness…).
  const action = useTopBarSlot();

  return (
    <header className="z-20 shrink-0 bg-surface pt-[max(0.5rem,env(safe-area-inset-top))]">
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
          {/* Home's presence line rides on the LEFT, beside the mark. */}
          {atHome && action}
        </div>
        <div className="flex items-center gap-1">
          {!atHome && action}
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

/**
 * A new screen starts at the top; the screen you came BACK to is where you
 * left it. Marking one lesson from the middle of a long course used to land
 * her back at the top of the course every time.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const previous = useRef(pathname);
  useEffect(() => {
    const scroller = () =>
      // On a desk the canvas scrolls, not <main>.
      (document.querySelector('[data-desk-canvas]') as HTMLElement | null) ??
      document.querySelector('main');
    const el = scroller();
    if (previous.current !== pathname) {
      positions.current.set(previous.current, el?.scrollTop ?? 0);
      previous.current = pathname;
    }
    const back =
      navType === 'POP' ? positions.current.get(pathname) : undefined;
    // The route's content mounts after this effect; give it a frame.
    const t = window.requestAnimationFrame(() =>
      scroller()?.scrollTo({ top: back ?? 0, left: 0 })
    );
    return () => window.cancelAnimationFrame(t);
  }, [pathname, navType]);
  return null;
}

export function AppShell() {
  const { status } = useAuth();
  // A desk route on a screen with room: the shell drops its cap, the tab bar
  // stands on its side, and the route's own panes do the scrolling.
  const desk = useIsDesk();
  // Heal this device's push subscription on every launch (no prompt) so loves
  // keep landing as real notifications even after the browser rotates it.
  useEnsurePushSubscription();
  // Tell her once when a release lands (admin device only).
  useAnnounceRelease();

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
        <TopBarSlotProvider>
          <div
            className={cn(
              'mx-auto flex h-full max-w-shell overflow-hidden bg-surface',
              desk ? 'flex-row' : 'flex-col'
            )}
          >
            <PresenceTracker />
            <ScrollToTop />
            <CacheWarmer />
            {desk && <SideRail />}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TopBar />
              <PendingPill />
              <main
                className={cn(
                  'min-h-0 flex-1 overflow-x-hidden [-webkit-overflow-scrolling:touch]',
                  desk
                    ? 'overflow-hidden'
                    : 'overflow-y-auto px-[0.875rem] pb-4 pt-[0.44rem]'
                )}
              >
                <Outlet />
              </main>
            </div>
            {!desk && <BottomNav />}
            <LoveBurst />
            <NotificationPrompt />
            <ChangelogModal />
          </div>
        </TopBarSlotProvider>
      )}
      <SplashScreen active={loading} />
    </>
  );
}
