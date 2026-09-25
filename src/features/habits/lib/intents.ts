import { create } from 'zustand';

/**
 * What you asked for, which outranks what the server last said.
 *
 * A tick has to feel like a light switch, so the wish is kept here, separately,
 * and laid over the server rows on every read. Two rules make that safe, and
 * between them they are the whole of this file:
 *
 *   1. A wish is dropped only once the database has been TOLD it and a later
 *      read agrees with it. While a write is still on its way the wish is
 *      `pending`, and no answer from the server can clear it - which is what
 *      used to happen: a refetch that started before the write landed came back
 *      with the old row, agreed with an older wish, and the circle flicked back.
 *
 *   2. Exactly one writer follows each square (see `commit`), and it keeps
 *      writing until the database matches the last thing you asked for. Taps do
 *      not queue up writes; they move a variable that the writer is watching.
 *
 * Together those make the wrong answer unreachable rather than unlikely. Tap
 * three hundred times as fast as a thumb can go: the screen shows your last tap
 * throughout, the database ends on your last tap, and it took two requests.
 */
export interface Wish {
  /** What you asked for. */
  on: boolean;
  /** True until the database has been told this exact thing. */
  pending: boolean;
}

interface IntentState {
  /** `${habitId}:${day}` → what you want it to be. */
  wanted: Readonly<Record<string, Wish>>;
  /** Flip one square and say what it became, in one indivisible step. */
  flip: (key: string, fallback: boolean) => boolean;
  /** The database has been told `on`, and did not object. */
  confirm: (key: string, on: boolean) => void;
  /** The server refused it. The one case where it knows better than the thumb. */
  forget: (key: string) => void;
  /** Drop every wish the server has caught up with. */
  settle: (server: ReadonlySet<string>) => void;
}

export const useIntents = create<IntentState>((set) => ({
  wanted: {},

  // The flip happens inside the store rather than at the call site because the
  // caller's idea of "before" is one render old. Two taps inside a single frame
  // both read the same stale `fallback`, and the second one would be a no-op.
  flip: (key, fallback) => {
    let next = fallback;
    set((s) => {
      const cur = s.wanted[key];
      next = cur ? !cur.on : fallback;
      return { wanted: { ...s.wanted, [key]: { on: next, pending: true } } };
    });
    return next;
  },

  confirm: (key, on) =>
    set((s) => {
      const cur = s.wanted[key];
      // Moved again while that write was in the air: still pending, and the
      // writer will come round for it.
      if (!cur || !cur.pending || cur.on !== on) return s;
      return { wanted: { ...s.wanted, [key]: { on, pending: false } } };
    }),

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
      for (const [key, wish] of Object.entries(wanted)) {
        // Still on its way. This snapshot cannot know about it, so it gets no
        // vote - the whole flicker lived in these two lines.
        if (wish.pending) continue;
        if (server.has(key) !== wish.on) continue;
        delete wanted[key];
        changed = true;
      }
      return changed ? { wanted } : s;
    }),
}));

/** Lay the wishes over what the server sent. */
export function withIntents(
  server: ReadonlySet<string>,
  wanted: Readonly<Record<string, Wish>>
): Set<string> {
  const out = new Set(server);
  for (const [key, wish] of Object.entries(wanted)) {
    if (wish.on) out.add(key);
    else out.delete(key);
  }
  return out;
}

/** Tell the database one square is on, or off. Must be idempotent. */
export type Write = (on: boolean) => Promise<void>;

const writers = new Map<string, Promise<boolean | null>>();

/**
 * One writer per square, following the wish until it stops moving.
 *
 * The old version sent one request per tap and put them in a queue. That is
 * three hundred requests for three hundred taps, and it only ever ends in the
 * right place because the last one happens to be last. This sends the state, not
 * the taps: while a write is in the air the taps only move the wish, and when it
 * lands the writer compares and goes again if it has to.
 *
 * Returns the last state it actually wrote, or null when it joined a writer that
 * was already out - so a caller can act on "the tick went on" exactly once,
 * however many times the thumb bounced.
 */
export function commit(
  key: string,
  write: Write,
  refuse: (err: unknown) => void
): Promise<boolean | null> {
  const running = writers.get(key);
  // Already being followed. That writer reads the wish this tap just changed
  // before it finishes, so there is nothing to start here.
  if (running) return running.then(() => null);
  const loop = follow(key, write, refuse);
  writers.set(key, loop);
  return loop;
}

async function follow(
  key: string,
  write: Write,
  refuse: (err: unknown) => void
): Promise<boolean | null> {
  // Yield once, so `commit` has this writer in the map before the first request
  // goes out. The map is how the next tap knows not to start a second one.
  await Promise.resolve();

  const store = useIntents.getState;
  let wrote: boolean | null = null;
  try {
    // A thumb cannot outrun the network forever, and a bounded loop cannot spin.
    for (let turn = 0; turn < 64; turn++) {
      const wish = store().wanted[key];
      if (!wish || !wish.pending) return wrote;
      try {
        await write(wish.on);
      } catch (err) {
        store().forget(key);
        refuse(err);
        return wrote;
      }
      wrote = wish.on;
      store().confirm(key, wish.on);
    }
    return wrote;
  } finally {
    writers.delete(key);
    // A tap that landed between the last read and this line would otherwise be
    // waiting on a writer that has stopped looking. Give it one of its own.
    if (store().wanted[key]?.pending) void commit(key, write, refuse);
  }
}
