import { usePartner } from '@kernel/auth';
import type { Lang } from '../types';

/** Only these three exist here, whatever a stray row in the database says. */
const KNOWN: readonly Lang[] = ['ru', 'es', 'en'];

function known(value: string | null | undefined, fallback: Lang): Lang {
  return KNOWN.includes(value as Lang) ? (value as Lang) : fallback;
}

export interface Languages {
  /** Mine. What I teach, and what I want things explained to me in. */
  native: Lang;
  /** My partner's. What I am learning. */
  learning: Lang;
  /**
   * Whether the pair above is known yet. Until the members row has loaded
   * the fallbacks stand in - and for the half-second that lasts she is
   * "learning Russian", so anything that decides who is the teacher must
   * wait for this rather than flash the wrong screen.
   */
  ready: boolean;
}

/**
 * Who teaches what, worked out rather than asked.
 *
 * There is no setting for this and there should not be one: she is Russian and
 * learning Spanish, he is Chilean and learning Russian, and both facts have
 * been sitting in `couple_members.native_language` / `learning_language` since
 * the couple was created. A course teaches one of the two languages, and every
 * screen can tell which side of it you are on from that alone.
 *
 * The fallbacks exist so a half-filled member row degrades to something usable
 * instead of a blank screen - never to invent a third arrangement.
 */
export function languagesOf(
  self:
    | { native_language?: string | null; learning_language?: string | null }
    | null
    | undefined,
  partner: { native_language?: string | null } | null | undefined
): Omit<Languages, 'ready'> {
  const native = known(self?.native_language, 'es');
  const learning = known(
    self?.learning_language ?? partner?.native_language,
    native === 'ru' ? 'es' : 'ru'
  );
  // A course that teaches the language you already speak is not a course.
  return {
    native,
    learning: learning === native ? (native === 'ru' ? 'es' : 'ru') : learning,
  };
}

/** The same thing, for a component. */
export function useLanguages(): Languages {
  const { self, partner, isLoading } = usePartner();
  return { ...languagesOf(self, partner), ready: !isLoading && !!self };
}

/**
 * Do I teach this course? The one whose language is my own.
 *
 * Nothing in the database says "teacher": the courses are shared and the
 * policies let either of us write anything. But a course teaches one of our
 * two languages, and whoever speaks it is the one giving it - so the
 * builder, the marking and the edit pencil follow that.
 */
export function isTeacherOf(
  course: { target_lang?: string | null } | null | undefined,
  native: Lang
): boolean {
  return !!course && course.target_lang === native;
}

/**
 * The languages a lesson in `target` can be EXPLAINED in, best first.
 *
 * Never the target itself: explaining спасибо in Russian helps nobody. English
 * is always in the list because it is the language the two of them actually
 * share, and it is what every legacy phrase was written in.
 */
export function supportLangs(target: Lang, native: Lang): Lang[] {
  const rest = KNOWN.filter((l) => l !== target);
  return [...rest].sort((a, b) => rank(a, native) - rank(b, native));
}

function rank(lang: Lang, native: Lang): number {
  if (lang === native) return 0;
  if (lang === 'en') return 1;
  return 2;
}
