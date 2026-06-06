import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
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
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3500);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Imperative toast helper, usable outside React. */
export const toast = {
  info: (message: string) =>
    useToastStore.getState().push({ tone: 'info', message }),
  success: (message: string) =>
    useToastStore.getState().push({ tone: 'success', message }),
  error: (message: string) =>
    useToastStore.getState().push({ tone: 'error', message }),
};
