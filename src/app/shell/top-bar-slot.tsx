/* eslint-disable react-refresh/only-export-components -- a tiny context module:
   the Provider lives beside its hooks on purpose so routes have one import. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

type Ctx = { action: ReactNode; setAction: (node: ReactNode) => void };

const TopBarSlotContext = createContext<Ctx | null>(null);

/** Holds the current route's optional top-bar control. */
export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null);
  return (
    <TopBarSlotContext.Provider value={{ action, setAction }}>
      {children}
    </TopBarSlotContext.Provider>
  );
}

/** Read side — the TopBar renders whatever the active route injected. */
export function useTopBarSlot(): ReactNode {
  return useContext(TopBarSlotContext)?.action ?? null;
}

/**
 * Inject a control into the top bar's right cluster for the current route.
 * Clears on unmount. Only one route mounts at a time (Outlet), so the
 * unmount-clear / mount-set order resolves to the newest route's action.
 * Pass `deps` like any effect (re-inject when the node's inputs change).
 */
export function useTopBarAction(node: ReactNode, deps: DependencyList) {
  const ctx = useContext(TopBarSlotContext);
  useEffect(() => {
    ctx?.setAction(node);
    return () => ctx?.setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
