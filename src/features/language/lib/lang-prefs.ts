import { create } from 'zustand';
import type { SupportLang, TargetLang } from '../types';

const KEY = 'katitos:lang-prefs';

interface Prefs {
  /** What is being taught on screen right now. */
  targetLang: TargetLang;
  /** The language it is explained in. */
  supportLang: SupportLang;
  setTarget: (lang: TargetLang) => void;
  setSupport: (lang: SupportLang) => void;
}

function load(): { targetLang: TargetLang; supportLang: SupportLang } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      return {
        targetLang: parsed.targetLang ?? 'ru',
        supportLang: parsed.supportLang ?? 'en',
      };
    }
  } catch {
    /* a corrupt preference is not worth crashing the app over */
  }
  return { targetLang: 'ru', supportLang: 'en' };
}

/**
 * Which language you are learning, and which one it is explained in.
 *
 * Kept on the device rather than in the database on purpose: it is a reading
 * preference, not shared state. He reads the English gloss, she reads the same
 * lesson in Spanish, and neither of them changes anything for the other.
 */
export const useLangPrefs = create<Prefs>((set) => ({
  ...load(),
  setTarget: (targetLang) =>
    set((s) => {
      persist({ ...s, targetLang });
      return { targetLang };
    }),
  setSupport: (supportLang) =>
    set((s) => {
      persist({ ...s, supportLang });
      return { supportLang };
    }),
}));

function persist(s: { targetLang: TargetLang; supportLang: SupportLang }) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ targetLang: s.targetLang, supportLang: s.supportLang })
    );
  } catch {
    /* private mode, quota — the preference just won't outlive the session */
  }
}
