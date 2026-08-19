import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastTone = 'info' | 'success' | 'error';

/** An offer to take it back, sitting inside the toast itself. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

export interface ToastOptions {
  action?: ToastAction;
  /**
   * Same key = same toast.
   *
   * A repeated action should update one message, not stack a new one on top.
   * Taking six stickers off a page used to leave six nine-second toasts piled
   * over the book you were trying to edit.
   */
  key?: string;
}

/** Nothing is worth more than this much of the screen. */
const MAX_VISIBLE = 3;

const timers = new Map<string, number>();

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'> & { key?: string }) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ key, ...t }) => {
    const id = key ?? nanoid(8);
    // Replacing: cancel the old countdown or it would take the NEW toast away
    // at the old one's deadline.
    const running = timers.get(id);
    if (running) window.clearTimeout(running);

    set((s) => {
      const rest = s.toasts.filter((x) => x.id !== id);
      return { toasts: [...rest, { ...t, id }].slice(-MAX_VISIBLE) };
    });

    // A toast carrying an Undo is the ONLY way back from a destructive tap,
    // so it waits longer than one that is merely telling you something.
    timers.set(
      id,
      window.setTimeout(
        () => {
          timers.delete(id);
          set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
        },
        t.action ? 9000 : 3500
      )
    );
  },
  dismiss: (id) => {
    const running = timers.get(id);
    if (running) window.clearTimeout(running);
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));

/**
 * Imperative toast helper, usable outside React.
 *
 * The optional action is what makes a destructive tap safe to make one tap:
 * "Taken off the page · Undo" beats a confirmation dialog nobody reads. Pass a
 * `key` for anything you might do twice in a row.
 */
export const toast = {
  info: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({ tone: 'info', message, ...opts }),
  success: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({ tone: 'success', message, ...opts }),
  error: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({ tone: 'error', message, ...opts }),
};
