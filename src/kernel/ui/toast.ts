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

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nanoid(8);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    // A toast carrying an Undo is the ONLY way back from a destructive tap,
    // so it waits longer than one that is merely telling you something.
    setTimeout(
      () => {
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
      },
      t.action ? 9000 : 3500
    );
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/**
 * Imperative toast helper, usable outside React.
 *
 * The optional action is what makes a destructive tap safe to make one tap:
 * "Taken off the page · Undo" beats a confirmation dialog nobody reads.
 */
export const toast = {
  info: (message: string, opts?: { action?: ToastAction }) =>
    useToastStore.getState().push({ tone: 'info', message, ...opts }),
  success: (message: string, opts?: { action?: ToastAction }) =>
    useToastStore.getState().push({ tone: 'success', message, ...opts }),
  error: (message: string, opts?: { action?: ToastAction }) =>
    useToastStore.getState().push({ tone: 'error', message, ...opts }),
};
