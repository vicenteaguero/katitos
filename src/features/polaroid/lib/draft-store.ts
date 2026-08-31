import { create } from 'zustand';

/**
 * A photo that has been taken but not yet saved, in transit between screens.
 *
 * The bottom bar's camera button opens the PHONE's camera — an
 * `<input capture>`, not `getUserMedia` — because that is the only way to take
 * a daily photo without iOS asking permission on every single launch. The catch
 * is that the file arrives wherever the input lives, which is the nav bar, and
 * it needs to reach the Polaroid screen to be cropped and saved.
 *
 * Passing it through this store rather than through the URL is not a shortcut:
 * a File cannot be a query param, and re-opening the camera on arrival would
 * need a user gesture the navigation has already spent.
 *
 * One draft at a time, cleared the moment the screen picks it up.
 */
interface PolaroidDraft {
  /** The day the photo is for, decided where the shutter was pressed. */
  draft: { day: string; file: File } | null;
  setDraft: (draft: { day: string; file: File }) => void;
  clearDraft: () => void;
}

export const usePolaroidDraft = create<PolaroidDraft>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
