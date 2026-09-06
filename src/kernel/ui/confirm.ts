import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  /** One or two sentences on what will happen. */
  body?: string;
  /** The verb on the button - "Delete the course", never "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red button: this cannot be undone. */
  danger?: boolean;
}

export interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  pending: Pending | null;
  ask: (p: Pending) => void;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  ask: (p) => {
    // A second question while one is open answers the first with "no".
    get().pending?.resolve(false);
    set({ pending: p });
  },
  settle: (ok) => {
    get().pending?.resolve(ok);
    set({ pending: null });
  },
}));

/**
 * Ask before doing something that cannot be taken back.
 *
 * `window.confirm` is a white system box in a wine-dark app, and it says OK.
 * This is the app's own dialog, usable from any handler like `toast`:
 *
 *     if (!(await confirmDialog({ title: 'Delete this course?', danger: true }))) return;
 *
 * Most deletes should not ask at all - an Undo in the toast is kinder than a
 * question nobody reads. This is for the few that really are forever.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) =>
    useConfirmStore.getState().ask({ ...opts, resolve })
  );
}

/** The same thing, for a component that prefers a hook. */
export function useConfirm() {
  return confirmDialog;
}
