import { DateTime } from 'luxon';
import { answerMatches } from './answer-match';
import { meaningOf, termOf } from './pick';
import { mastery, type Grade, type ReviewState } from './srs';
import type { Vocab } from '../types';

/** The four ways a card can be asked. */
export type Mode = 'recall' | 'choice' | 'type' | 'listen';

/** A small stable hash, so the same card gets the same options on every render. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * How a card is asked, by how well it is known.
 *
 * A new word is shown before it is asked; a word being learned is asked in
 * the easy directions; a known word has to be produced - typed, or written
 * down from her voice. The old wheel ignored all of that, and `mastery()`
 * sat unused beside it.
 */
export function modeFor(
  card: Vocab,
  review: ReviewState | null | undefined,
  index: number
): Mode {
  const m = mastery(review);
  const wheel: Mode[] =
    m === 'new'
      ? ['recall', 'choice', 'recall']
      : m === 'learning'
        ? ['choice', 'type', 'recall', 'listen']
        : ['type', 'listen', 'type', 'choice'];
  let want = wheel[index % wheel.length];
  // A card with no recording is never asked by ear; a long phrase is not
  // typed; a card with no meaning to show can only be recalled.
  if (want === 'listen' && !card.audio_path) want = 'type';
  if (want === 'type' && termOf(card).length > 24) want = 'recall';
  if (want === 'choice' && !meaningOf(card, 'en')) want = 'recall';
  return want;
}

/**
 * Three wrong answers and the right one, stable for a given card.
 *
 * The old stride (`k * 13 % n`) handed back ONE distractor at thirteen words
 * and never checked that a distractor was not the answer spelled the same
 * way. Now: distinct text, never the answer, the same kind of word first (a
 * verb among nouns gives itself away), and the right one in a slot that
 * does not follow the card's position.
 */
export function choicesFor(card: Vocab, all: Vocab[], seed: number): Vocab[] {
  const answer = termOf(card).toLowerCase();
  const kind = card.part_of_speech;
  const ranked = all
    .filter((p) => p.id !== card.id && termOf(p))
    .map((p) => ({
      p,
      key:
        (kind && p.part_of_speech === kind ? 0 : 1) * 2 ** 32 +
        hash(`${p.id}:${card.id}:${seed}`),
    }))
    .sort((a, b) => a.key - b.key);
  const picked: Vocab[] = [];
  const seen = new Set([answer]);
  for (const { p } of ranked) {
    const text = termOf(p).toLowerCase();
    if (seen.has(text)) continue;
    seen.add(text);
    picked.push(p);
    if (picked.length === 3) break;
  }
  const slot = hash(`${card.id}:${seed}`) % (picked.length + 1);
  return [...picked.slice(0, slot), card, ...picked.slice(slot)];
}

/**
 * Every form a typed answer may match: the word, and the stressed spelling
 * she wrote for it. If the stressed form has a typo in it - a wrong vowel,
 * a missing letter - it must not make the word unanswerable, so both count.
 */
export function expectedForms(card: Vocab): string[] {
  const forms = [termOf(card), card.stress ?? ''].filter(Boolean);
  return [...new Set(forms)];
}

/** How close a typed answer came, and why it was not right. */
export type Miss = 'exact' | 'accent' | 'spaces' | 'typo' | 'wrong';

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[-–, ]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/ё/g, 'е')
    .trim();

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      last = tmp;
    }
  }
  return prev[b.length];
}

/**
 * A red cross needs a reason. Once accents are graded strictly (they are -
 * `está` and `esta` are different words), "wrong" alone teaches nothing;
 * "you missed the accent" teaches the thing.
 */
export function nearMiss(typed: string, expected: string[]): Miss {
  if (!typed.trim()) return 'wrong';
  if (expected.some((e) => answerMatches(typed, e))) return 'exact';
  const t = plain(typed);
  for (const e of expected) {
    const x = plain(e);
    if (t === x) return 'accent';
    if (t.replace(/\s/g, '') === x.replace(/\s/g, '')) return 'spaces';
  }
  for (const e of expected) {
    const x = plain(e);
    const slack = x.length >= 8 ? 2 : x.length >= 4 ? 1 : 0;
    if (slack && levenshtein(t, x) <= slack) return 'typo';
  }
  return 'wrong';
}

/** What to say under the reveal, in one line. */
export function missMessage(
  miss: Miss,
  typed: string,
  expected: string
): string {
  switch (miss) {
    case 'exact':
      return 'Exactly right 🌟';
    case 'accent':
      return `Almost - mind the accent: ${expected}`;
    case 'spaces':
      return `Almost - it is written as separate words: ${expected}`;
    case 'typo':
      return `Almost - one letter off: ${expected}`;
    default:
      return `You wrote "${typed}" - it is ${expected}`;
  }
}

/** The grade the app would give; his three buttons still decide. */
export function suggestGrade(miss: Miss): Grade {
  return miss === 'exact' ? 2 : miss === 'wrong' ? 0 : 1;
}

/* ── A session survives a phone call ─────────────────────────────────────── */

export interface SavedSession {
  day: string;
  ids: string[];
  i: number;
  score: { right: number; total: number };
  missed: string[];
}

const KEY = (scope: string) => `katitos:study:${scope}`;

export function loadSession(
  scope: string,
  today: string = DateTime.now().toISODate()!
): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY(scope));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSession;
    // Yesterday's half-session is not today's: the schedule has moved on.
    if (saved.day !== today || !Array.isArray(saved.ids)) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveSession(scope: string, state: SavedSession): void {
  try {
    sessionStorage.setItem(KEY(scope), JSON.stringify(state));
  } catch {
    /* a phone with no room forgets; nothing else changes */
  }
}

export function clearSession(scope: string): void {
  try {
    sessionStorage.removeItem(KEY(scope));
  } catch {
    /* nothing to clear */
  }
}
