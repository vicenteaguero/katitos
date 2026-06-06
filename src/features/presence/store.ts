import { create } from 'zustand';

interface PresenceState {
  onlineIds: string[];
  setOnline: (ids: string[]) => void;
}

/** Shared online-presence state, fed by the single PresenceTracker. */
export const usePresenceStore = create<PresenceState>((set) => ({
  onlineIds: [],
  setOnline: (ids) => set({ onlineIds: ids }),
}));
