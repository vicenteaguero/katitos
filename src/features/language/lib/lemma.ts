import type { Lang } from '../types';

/**
 * Dictionary forms an inflected word might come from, best guess first.
 *
 * He taps «городе» in a lesson and the dictionary holds «город». Without a
 * step like this the tap-a-word glossary finds nothing for almost every
 * Russian word on the page - nouns decline, verbs conjugate, and only the
 * dictionary form is ever stored. This is not morphology; it is a list of
 * endings and a handful of stems to try, which is enough to land on the
 * right row nearly every time a lesson uses a word it also teaches.
 */
const RU_ENDINGS = [
  'иями',
  'ями',
  'ами',
  'ого',
  'его',
  'ому',
  'ему',
  'ыми',
  'ими',
  'ешь',
  'ёшь',
  'ишь',
  'ете',
  'ёте',
  'ите',
  'ють',
  'лся',
  'лась',
  'лось',
  'лись',
  'ться',
  'ах',
  'ях',
  'ов',
  'ев',
  'ёв',
  'ей',
  'ой',
  'ем',
  'ём',
  'ом',
  'ам',
  'ям',
  'ую',
  'юю',
  'ая',
  'яя',
  'ое',
  'ее',
  'ые',
  'ие',
  'ым',
  'им',
  'ых',
  'их',
  'ет',
  'ёт',
  'ит',
  'ут',
  'ют',
  'ат',
  'ят',
  'ла',
  'ло',
  'ли',
  'ть',
  'ся',
  'а',
  'я',
  'ы',
  'и',
  'у',
  'ю',
  'е',
  'о',
  'ь',
  'й',
  'л',
];
const RU_TAILS = [
  '',
  'а',
  'я',
  'ь',
  'о',
  'е',
  'ый',
  'ий',
  'ой',
  'ть',
  'ить',
  'ать',
  'еть',
  'ять',
  'уть',
  'овать',
];

const ES_ENDINGS = [
  'iendo',
  'ando',
  'aron',
  'ieron',
  'ados',
  'adas',
  'idos',
  'idas',
  'ado',
  'ada',
  'ido',
  'ida',
  'aba',
  'ía',
  'es',
  'as',
  'os',
  'ar',
  'er',
  'ir',
  's',
  'a',
  'o',
  'e',
  'é',
  'ó',
  'í',
];
const ES_TAILS = ['', 'o', 'a', 'e', 'ar', 'er', 'ir'];

export function lemmaCandidates(word: string, lang: Lang): string[] {
  const base = word.normalize('NFC').toLowerCase().replace(/́/g, '');
  const out = new Set<string>([base]);
  if (lang === 'ru') out.add(base.replace(/ё/g, 'е'));
  const endings = lang === 'ru' ? RU_ENDINGS : lang === 'es' ? ES_ENDINGS : [];
  const tails = lang === 'ru' ? RU_TAILS : lang === 'es' ? ES_TAILS : [''];
  for (const end of endings) {
    if (base.length - end.length < 2 || !base.endsWith(end)) continue;
    const stem = base.slice(0, -end.length);
    for (const tail of tails) out.add(stem + tail);
  }
  return [...out];
}

/** One spelling for a headword, so «Город» and «город» are the same row. */
export function normalHead(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/́/g, '')
    .replace(/ё/g, 'е')
    .trim();
}

/**
 * The dictionary row a tapped word belongs to, if any.
 *
 * Exact dictionary form first, then the candidate forms, then a row whose
 * headword starts with the longest stem - «говорим» finds «говорить».
 */
export function findWord<T extends { id: string }>(
  word: string,
  lang: Lang,
  rows: T[],
  headOf: (row: T) => string
): T | null {
  const byHead = new Map<string, T>();
  for (const r of rows) {
    const h = normalHead(headOf(r));
    if (h && !byHead.has(h)) byHead.set(h, r);
  }
  for (const c of lemmaCandidates(word, lang)) {
    const hit = byHead.get(c);
    if (hit) return hit;
  }
  const base = normalHead(word);
  for (let n = base.length - 1; n >= 4; n--) {
    const stem = base.slice(0, n);
    for (const [h, r] of byHead) if (h.startsWith(stem)) return r;
  }
  return null;
}
