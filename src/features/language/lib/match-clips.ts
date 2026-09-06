import type { Vocab } from '../types';

/**
 * Which word a dropped sound file belongs to.
 *
 * She records a folder of clips on her computer and names each one after
 * its word - "спасибо.m4a", "spasibo.m4a", or the row's id. The name (minus
 * its extension) is matched against the word, its transliteration and its id,
 * case-insensitively and with the stress mark ignored.
 */
export interface ClipMatch {
  file: File;
  word: Vocab | null;
}

const key = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/́/g, '')
    .replace(/[\s_-]+/g, ' ')
    .trim();

export function matchClips(
  files: File[],
  words: readonly Vocab[]
): ClipMatch[] {
  const byKey = new Map<string, Vocab>();
  for (const w of words) {
    for (const k of [w.ru, w.es, w.en, w.transliteration, w.stress, w.id]) {
      if (k) byKey.set(key(k), w);
    }
  }
  return files.map((file) => {
    const stem = file.name.replace(/\.[^.]+$/, '');
    return { file, word: byKey.get(key(stem)) ?? null };
  });
}
