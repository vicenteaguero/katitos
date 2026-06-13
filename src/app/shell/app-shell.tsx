import { useEffect, useState } from 'react';
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

/**
 * TEMP readout — confirms the standalone viewport after the status-bar fix +
 * re-install. With status-bar-style "black" the web view renders below an
 * opaque status strip, so iH stays ~797 but the bottom band is gone. Remove
 * this badge once verified on device.
 */
function DiagBadge() {
  const [m, setM] = useState('…');
  useEffect(() => {
    const tick = () => {
      const iH = Math.round(window.innerHeight);
      const scr = window.screen ? Math.round(window.screen.height) : -1;
      const cs = getComputedStyle(document.documentElement);
      const sat = cs.getPropertyValue('--sat').trim() || '?';
      const sab = cs.getPropertyValue('--sab').trim() || '?';
      setM(`iH${iH} scr${scr} sat${sat} sab${sab}`);
    };
    tick();
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="fixed left-1/2 top-[max(2.5rem,env(safe-area-inset-top))] z-[999] max-w-[92vw] -translate-x-1/2 rounded-full bg-[#ffd400] px-3 py-1 text-center font-sans text-[10px] font-extrabold text-black shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
      {m}
    </div>
  );
}

export function AppShell() {
  const { status } = useAuth();
  // Heal this device's push subscription on every launch (no prompt) so loves
  // keep landing as real notifications even after the browser rotates it.
  useEnsurePushSubscription();

  if (status === 'loading') return <LoadingScreen label="Loading our place…" />;
  if (status === 'anon') return <LoginScreen />;

  // App-shell: full-height flex column (sized off the html/body/#root height:100%
  // chain — the one measurement iOS standalone resolves reliably) where ONLY
  // <main> scrolls, so the top bar + bottom nav stay put. (Ionic/Framework7 use
  // this same pattern; viewport units and JS height-pinning were both unreliable
  // here — the real fix was the opaque status bar, see index.html.)
  return (
    <>
      <DiagBadge />
      <div className="mx-auto flex h-full max-w-app flex-col overflow-hidden bg-surface">
        <PresenceTracker />
        <CacheWarmer />
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[1.75rem] pb-8 pt-[1.75rem] [-webkit-overflow-scrolling:touch]">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </>
  );
}
