/* eslint-disable react-refresh/only-export-components -- a tiny context module:
   the Provider lives beside its hooks on purpose so callers have one import. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

/**
 * What a screen asks of the shell around it.
 *
 * The shell used to derive everything from the URL: the title from the first
 * path segment (so every screen under /language said "Language"), the back
 * button always, the tab bar always. A screen can now own its chrome: its
 * title and a line under it, one action on the right, an X instead of a
 * back arrow, no tab bar while it is full-screen, and a darker ground.
 */
export interface ScreenChrome {
  /** Replaces the section name when set. */
  title?: ReactNode;
  /** A second, muted line under the title. */
  subtitle?: ReactNode;
  /** One control in the right cluster. */
  action?: ReactNode;
  /** An X instead of the arrow, and where it goes instead of history. */
  back?: { icon?: 'back' | 'close'; to?: string };
  /** Full-screen: the tab bar is not rendered, `<html data-immersive>` is set. */
  hideNav?: boolean;
  /** The ground the screen sits on: the shell's surface, or the house black. */
  stage?: 'surface' | 'house';
}

type Patch = { id: symbol; chrome: ScreenChrome };
type Ctx = {
  chrome: ScreenChrome;
  set: (id: symbol, chrome: ScreenChrome | null) => void;
};

const TopBarSlotContext = createContext<Ctx | null>(null);

/** Merge every live patch, newest last, so the current screen wins. */
function merge(patches: Patch[]): ScreenChrome {
  const out: ScreenChrome = {};
  for (const p of patches) Object.assign(out, strip(p.chrome));
  return out;
}
function strip(c: ScreenChrome): ScreenChrome {
  const out: ScreenChrome = {};
  for (const [k, v] of Object.entries(c)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Holds the current route's chrome. */
export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  const [patches, setPatches] = useState<Patch[]>([]);
  const set = useRef((id: symbol, chrome: ScreenChrome | null) => {
    setPatches((list) => {
      const rest = list.filter((p) => p.id !== id);
      return chrome ? [...rest, { id, chrome }] : rest;
    });
  }).current;
  return (
    <TopBarSlotContext.Provider value={{ chrome: merge(patches), set }}>
      {children}
    </TopBarSlotContext.Provider>
  );
}

/** Read side: everything the active screen asked for. */
export function useTopBarChrome(): ScreenChrome {
  return useContext(TopBarSlotContext)?.chrome ?? {};
}

/** Read side, kept for the shell: only the right-cluster control. */
export function useTopBarSlot(): ReactNode {
  return useTopBarChrome().action ?? null;
}

/**
 * Ask the shell for chrome while this component is mounted. Clears on
 * unmount. Fields left undefined do not override what another component on
 * the same screen set, so one component can own the title and another the
 * action. Pass `deps` like any effect.
 */
export function useScreenChrome(chrome: ScreenChrome, deps: DependencyList) {
  const ctx = useContext(TopBarSlotContext);
  const id = useRef(Symbol('chrome')).current;
  useEffect(() => {
    ctx?.set(id, chrome);
    return () => ctx?.set(id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Inject one control into the top bar's right cluster for this screen. */
export function useTopBarAction(node: ReactNode, deps: DependencyList) {
  useScreenChrome({ action: node }, deps);
}
