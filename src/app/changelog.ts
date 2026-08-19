/**
 * What changed, in words she'd actually use.
 *
 * Not a dev changelog. She asked to know what her Katito adds, so every line
 * is about what she can now DO, never about a table or a bug id. Ships inside
 * the bundle: no round-trip, works offline, and impossible to get out of sync
 * with the code it describes.
 *
 * ── HOW THIS WORKS ─────────────────────────────────────────────────────────
 * Add a new entry at the TOP for every release. The modal re-arms itself
 * automatically, because "have I seen it" is a digest of the newest entry's
 * text — edit a single word and it will show again. There is no version number
 * to remember to bump.
 */
export interface ChangelogEntry {
  /** Human, not semver: what this release is about. */
  title: string;
  /** ISO date, shown as "11 August 2026". */
  date: string;
  /** One line per thing she can now do. Warm, plain, no jargon. */
  lines: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    title: 'Your classroom',
    date: '2026-08-19',
    lines: [
      'Russian is a real course now. You build it the way you would at work: units, lessons inside them, and each lesson can be homework or an exam with a date on it.',
      'You write a lesson out of pieces — a paragraph, a list of words, a video, a question — and you can move them around until it reads right.',
      'Eight kinds of question: choose one, choose several, type it, fill the gaps, put the words in order, match the pairs, listen and write, or say it out loud.',
      'Nothing reaches him until you decide it is ready. When you hand a lesson over, his phone tells him.',
      'You can see what he answered and what he got wrong, and leave him a note.',
      'The alphabet is here — all thirty-three letters, what each one sounds like, and a word that uses it. You can record each one in your own voice.',
      'A dictionary that keeps growing. Every word is written once, so fixing it fixes it everywhere. Search it, hear it, add to it.',
      'Everything you write can carry English AND Spanish. Write it once with English and it already works; add the Spanish whenever you like and the same lesson teaches you too.',
      'The recordings finally work. Anything either of us records now plays properly on the other one’s phone — it never really did before.',
      'Building lessons on a laptop or a tablet has room to breathe now, instead of a narrow phone column. And the app will turn sideways.',
      'The album has a photo library. Add twenty photos at once, then tap any of them to drop it on the page you have open.',
      'Taking a photo off a page no longer throws the photo away — it goes back to the strip under the book. And if you did not mean to, there is an Undo.',
      'You can bring a photo to the front or send it behind the others, whenever you like.',
      'Any photo can become a polaroid, with your own words underneath, in the size and the lettering you choose.',
      'Photos keep their real shape instead of being squashed into squares.',
      'The page curl is not cut off at the top and bottom any more.',
      'The album opens much faster, and the pages you are about to turn to are ready before you get there.',
      'Every album can have its own name, its dates and its cover, and each page can be titled.',
    ],
  },
  {
    title: 'Smoother',
    date: '2026-08-12',
    lines: [
      'Photos load properly now. The little previews were secretly enormous — they are twenty times smaller, and the whole album is ready before you scroll to it.',
      'Opening a photo shows it straight away instead of making you wait for it.',
      'The camera should stop asking for permission every single time.',
      'Flowers now go from June 2025 all the way through this year, and each December the next year opens on its own. Each one sits on a proper little polaroid.',
      'Adding a wish is simpler: paste the link, add a picture, done.',
      'The plus button moved up to the top bar, out of the way of what you are reading.',
      'The nightly questions are resting for a while — that one still needs some love before it deserves you.',
      'The days-together number appears the instant you open the app. It used to blink 0 at you first, which was a horrible thing to read.',
      'Our two polaroids overlap now, yours resting on mine. Tap the one underneath and it slides to the front.',
      'On the wall you can finally push a note all the way to the edge. To rub one out, tap it — it lights up gold — then tap the bin at the top.',
      'The flowers appear newest first, and every month is already waiting there while they load.',
      'The converter opens at zero instead of a dash.',
      'The gift lists carry our own names and our own little faces now.',
    ],
  },
  {
    title: 'For the distance',
    date: '2026-08-11',
    lines: [
      'Our polaroid is now TWO polaroids — one from you, one from me, side by side for the same day. Your Sunday next to my Sunday, even when your day starts eleven hours before mine.',
      'If one of us forgets, the other one still shows. And you can add a photo from your gallery for a day that is still today for either of us.',
      'Old photos load much faster now.',
      'Albums! One book for each part of our life, as many as we want. Georgia and Türkiye can finally have its own.',
      'Wishlists are back, as gift lists — one for you, one for me. Every wish has a little eye: closed means only you can see it, so surprises stay surprises.',
      'Flowers: a bouquet for every month, three across, with the month written under each one. Yours to fill.',
      'Russian lessons that actually remember. The app knows what you already know and what to ask again, and there is a Russian keyboard built in.',
      'The converter speaks euros now, and it always shows pesos and rubles underneath, so we never have to convert twice to tell each other a number.',
      'The wall opens straight away instead of making you wait.',
      'On the 15th, wherever either of us is, the app says happy monthversary.',
      'Summer Travel is put away safely — nothing lost, just resting until the next trip.',
    ],
  },
];

/** The one she'll be shown. */
export const LATEST = CHANGELOG[0];

/**
 * A stable fingerprint of the newest entry.
 *
 * Deliberately derived from the CONTENT: the requirement was "if the changelog
 * changes, the modal comes back", and a hand-maintained version number only
 * satisfies that if nobody ever forgets to bump it. This cannot be forgotten.
 *
 * djb2 — tiny, stable across reloads, and good enough for change detection.
 */
export function changelogKey(entry: ChangelogEntry = LATEST): string {
  const source = `${entry.title}|${entry.date}|${entry.lines.join('|')}`;
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) >>> 0;
  }
  return `${entry.date}-${hash.toString(36)}`;
}

export const LATEST_KEY = changelogKey();
