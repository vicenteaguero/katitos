import { useEffect, useState, type CSSProperties } from 'react';
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

// ── TEMP: shell-height probe ────────────────────────────────────────────────
// Five different ways to make the shell exactly fill the iPhone standalone
// viewport. Tap the yellow badge to cycle; tell me which letter sits right
// (nav flush at the bottom, no empty band). Then this whole block goes away.
// (Bonus: if you can't even SEE the yellow badge, you're on a stale cached
// build — that's a service-worker problem, not a layout one.)
interface ShellMode {
  id: string;
  label: string;
  cls: string;
  style?: CSSProperties;
}
const SHELL_MODES: ShellMode[] = [
  { id: 'A', label: 'fixed inset-0', cls: 'fixed inset-0' },
  { id: 'B', label: 'height 100dvh', cls: 'h-[100dvh]' },
  { id: 'C', label: 'height 100svh', cls: 'h-[100svh]' },
  {
    id: 'D',
    label: '-webkit-fill-available',
    cls: '',
    style: { height: '-webkit-fill-available' },
  },
  { id: 'E', label: 'height 100% chain', cls: 'h-full' },
];

/** TEMP diagnostic badge — live device numbers + tap to cycle the layout mode. */
function DiagBadge({ id, onCycle }: { id: string; onCycle: () => void }) {
  const [m, setM] = useState('…');
  useEffect(() => {
    const tick = () => {
      const bottom = (el: Element | null) =>
        el ? Math.round(el.getBoundingClientRect().bottom) : -1;
      const iH = Math.round(window.innerHeight);
      const vv = window.visualViewport
        ? Math.round(window.visualViewport.height)
        : -1;
      const scr = window.screen ? Math.round(window.screen.height) : -1;
      const navB = bottom(document.querySelector('nav'));
      setM(
        `iH${iH} vv${vv} scr${scr} shB${bottom(
          document.getElementById('appshell')
        )} navB${navB} gap${iH - navB}`
      );
    };
    tick();
    const t = window.setInterval(tick, 400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <button
      type="button"
      onClick={onCycle}
      className="fixed left-1/2 top-[max(2.5rem,calc(env(safe-area-inset-top)+0.25rem))] z-[999] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#ffd400] px-3 py-1.5 font-sans text-[10px] font-extrabold leading-tight text-black shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
    >
      {id} · {m} ⟳
    </button>
  );
}

export function AppShell() {
  const { status } = useAuth();
  // Heal this device's push subscription on every launch (no prompt) so loves
  // keep landing as real notifications even after the browser rotates it.
  useEnsurePushSubscription();

  const [modeIdx, setModeIdx] = useState(() => {
    try {
      const n = Number(localStorage.getItem('katitos:shell-mode'));
      return Number.isInteger(n) && n >= 0 && n < SHELL_MODES.length ? n : 0;
    } catch {
      return 0;
    }
  });

  if (status === 'loading') return <LoadingScreen label="Loading our place…" />;
  if (status === 'anon') return <LoginScreen />;

  const mode = SHELL_MODES[modeIdx];
  const cycle = () => {
    const next = (modeIdx + 1) % SHELL_MODES.length;
    setModeIdx(next);
    try {
      localStorage.setItem('katitos:shell-mode', String(next));
    } catch {
      /* ignore */
    }
  };

  // App-shell: a fixed-height column where ONLY <main> scrolls, so the top bar
  // and bottom nav are ALWAYS visible (native-PWA feel).
  return (
    <>
      <DiagBadge id={mode.id} onCycle={cycle} />
      <div
        id="appshell"
        className={`${mode.cls} mx-auto flex max-w-app flex-col overflow-hidden bg-surface`}
        style={mode.style}
      >
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
