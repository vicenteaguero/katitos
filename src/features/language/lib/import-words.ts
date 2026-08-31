/**
 * Words pasted from anywhere — a spreadsheet, a note, a message.
 *
 * One word per line. The word and its meaning are told apart by whatever the
 * line uses: a tab, " = ", " — ", " - ", ";", "," or ":" — tried in that order,
 * so "мама, папа = mum, dad" splits at the "=" and keeps the commas. A third
 * column is the transliteration; anything after "#" on the line is a tag.
 */
export interface ImportedWord {
  term: string;
  meaning: string;
  transliteration?: string;
  tags: string[];
}

const SEPARATORS = ['\t', ' = ', ' — ', ' – ', ' - ', ';', ',', ':'];

export function parseWordList(text: string): ImportedWord[] {
  const out: ImportedWord[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    // #tag #another — anywhere on the line.
    const tags: string[] = [];
    line = line
      .replace(/#([^\s#]+)/g, (_, t: string) => {
        tags.push(t.toLowerCase());
        return '';
      })
      .trim();
    const sep = SEPARATORS.find((s) => line.includes(s));
    if (!sep) {
      // A bare word: keep it, so a list without meanings still comes in.
      out.push({ term: line, meaning: '', tags });
      continue;
    }
    const cells = line.split(sep).map((c) => c.trim());
    const [term, meaning = '', transliteration] = cells;
    if (!term) continue;
    out.push({
      term,
      meaning,
      ...(transliteration ? { transliteration } : {}),
      tags,
    });
  }
  return out;
}

/** The ones already in the dictionary, matched without regard to case. */
export function splitKnown(
  words: ImportedWord[],
  existing: Iterable<string>
): { fresh: ImportedWord[]; known: ImportedWord[] } {
  const have = new Set([...existing].map((t) => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const fresh: ImportedWord[] = [];
  const known: ImportedWord[] = [];
  for (const w of words) {
    const key = w.term.toLowerCase();
    if (have.has(key) || seen.has(key)) known.push(w);
    else {
      seen.add(key);
      fresh.push(w);
    }
  }
  return { fresh, known };
}
