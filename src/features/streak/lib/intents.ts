import { create } from 'zustand';

/**
 * What you asked for, which outranks what the server last said.
 *
 * A tick has to feel like a light switch. The old version painted the cache
 * optimistically and then invalidated on settle, so every tap raced its own
 * refetch: tap twice quickly, or tap while a realtime event was in flight, and
 * the circle flickered back to whatever the last response happened to contain.
 *
 * So the wish is kept here, separately, and laid over the server rows on every
 * read. It is removed only when the server comes back agreeing with it - or
 * when the write is refused, which is the one case where the server genuinely
 * knows better and we say so out loud. Until then, on means on.
 */
interface IntentState {
  /** `${habitId}:${day}` → what you want it to be. */
  wanted: Readonly<Record<string, boolean>>;
  want: (key: string, on: boolean) => void;
  forget: (key: string) => void;
  /** Drop every wish the server has caught up with. */
  settle: (server: ReadonlySet<string>) => void;
}

export const useIntents = create<IntentState>((set) => ({
  wanted: {},
  want: (key, on) => set((s) => ({ wanted: { ...s.wanted, [key]: on } })),
  forget: (key) =>
    set((s) => {
      if (!(key in s.wanted)) return s;
      const wanted = { ...s.wanted };
      delete wanted[key];
      return { wanted };
    }),
  settle: (server) =>
    set((s) => {
      const wanted = { ...s.wanted };
      let changed = false;
      for (const [key, on] of Object.entries(wanted)) {
        if (server.has(key) === on) {
          delete wanted[key];
          changed = true;
        }
      }
      return changed ? { wanted } : s;
    }),
}));

/** Lay the wishes over what the server sent. */
export function withIntents(
  server: ReadonlySet<string>,
  wanted: Readonly<Record<string, boolean>>
): Set<string> {
  const out = new Set(server);
  for (const [key, on] of Object.entries(wanted)) {
    if (on) out.add(key);
    else out.delete(key);
  }
  return out;
}

const chains = new Map<string, Promise<unknown>>();

/**
 * One habit-day at a time, in the order the taps happened.
 *
 * Without this, on/off/on sends three requests that can land in any order and
 * the last one to arrive wins - which is not the last one you meant.
 */
export function inOrder<T>(key: string, run: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.then(run, run);
  chains.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}
