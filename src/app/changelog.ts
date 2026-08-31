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
  /**
   * Written, but not hers to read yet.
   *
   * The code and the database can ship days before she is told about them — he
   * decides when the occasion happens. A held entry is filtered out of
   * `CHANGELOG` completely, so it is missing from Settings too, and `LATEST_KEY`
   * keeps pointing at the last announced release: the modal cannot arm and the
   * release push cannot fire. Deleting this one line is the whole announcement.
   */
  held?: boolean;
}

/** Every release ever written, newest first — held ones included. */
export const ALL_ENTRIES: ChangelogEntry[] = [
  {
    // Written 30 August 2026. Held until he lifts it.
    title: 'Nothing gets lost',
    date: '2026-08-30',
    held: true,
    lines: [
      'Deleting a word puts it away instead of destroying it, and there is an Undo for nine seconds. The same for a block or a question in a lesson, and for a file on a block: taking it off keeps the file, and one tap puts it back.',
      'Recording a word again keeps the newer one, everywhere, first time. It used to play the old clip until you had recorded it twice.',
      'A word that is already in the dictionary takes the recording you just made, instead of quietly dropping it.',
      'Russian is finally set in the app’s own typefaces — the stress mark on a vowel too. It had been falling back to whatever the phone had.',
      'Your Spanish lessons keep their Russian explanations as Russian, and show the Spanish sentence on top. Every box in the builder now writes to its own language.',
      'Reopening a “put in order” question no longer scrambles the right answer, and a “match the pairs” question can be corrected instead of retyped.',
      'Taking an option off a question no longer leaves a right answer nobody can pick, and switching the kind of question starts it clean.',
      'Translating a table’s headings keeps the headings in the other language.',
      'His answers survive a reload, homework finished in two sittings counts as finished, and an exam is handed in once.',
      'Once you have marked a lesson, it stays marked, whatever he does with it afterwards.',
      'The lesson settings open fresh each time. An edit you abandoned no longer goes out with the next publish, and the course list learns a new title straight away.',
      'The app no longer reloads itself while you are typing. A new version waits for the next launch.',
      'Signing out on a shared computer clears everything of yours from it.',
      'On a computer you can type an answer with the keyboard. On a phone, the on-screen letters now have a space bar — and ё.',
      'An accent typed as a separate mark counts the same as one typed as a letter.',
      'The “you got it right” ring is green now. It was blue.',
      'The alphabet is there for you too, so you can record the letters in your own voice — and “Hear it” appears the moment a recording lands.',
      'The card on the home screen names the language it is about, points at homework that is actually still waiting, and counts words only once it knows.',
      'What he keeps forgetting shows up on your side at last.',
      'Homework due today says “today” all day, not “1 day late” from lunchtime.',
      'Tapping the words “Say it” no longer starts a recording by itself.',
    ],
  },
  {
    // Shipped and announced 21 August 2026.
    title: 'The album, properly',
    date: '2026-08-21',
    lines: [
      'Framing a photo happens on a screen of its own now: the picture comes up big, you move it with your finger and pinch to come closer, and nothing changes until you say Done. Change your mind and nothing was ever touched.',
      'Six mounts that are actually different — bare, on a card, on instant film, a thin gold line, taped at the corners, or lifted off the page with a shadow — in ten colours, and you choose how wide the card is.',
      'The card follows the shape of the photo now. A round photo gets a round card.',
      'A caption sits under the photo instead of stretching its frame out of shape.',
      'Pages come two at a time, the way paper does. Tearing one out only ever removes the one you picked.',
      'Opening the cover shows what was behind it, then slides across — instead of everything appearing at once.',
      'The two pages of an open book are lit from the same side, with the fold darker in the middle.',
      'A photo you already added appears the instant you tap it. No more little loading moment for a picture that was already on your screen.',
      'The Undo message goes away in a couple of seconds instead of sitting over the page for nine.',
      'Every album is a real book now. It starts closed, on its own cover, with its name in gold and the months it covers underneath — and you turn the cover to open it, like a book.',
      'There is a back cover too, so a book actually ends instead of just running out of pages.',
      'You choose what it is made of: leather, linen, velvet or brown paper for the covers, and cream, ivory, kraft or night-dark paper for the pages inside.',
      'A photo can be cut into a shape — soft corners, a square, a circle, an arch, a heart, or torn out at the edges.',
      'And you choose how it is mounted: bare, on a card, on instant film, in a thin gold line, taped down at the corners, or just lifted off the page with a shadow. The card comes in six colours.',
      'You can move the picture around inside its frame and pinch to come closer, so a photo shows the part of it you actually want. Nothing is cut away — change your mind whenever you like.',
      'The strip of photos under the book is two rows deep now, so you can see far more of them at once, and it fits whatever phone you are holding.',
      'Hold a photo down and you start choosing: pick as many as you like and they all go onto the page together, spread out.',
      'There is a proper gallery of everything in the album now, for when the strip is not enough — choose several, place them, or throw them out.',
      'You can take a photo straight into the album without leaving the page you are putting it on.',
      'Photos appear the instant you tap them instead of after a pause, and pages no longer flash while you are working.',
      'A page opens showing a soft blur of each photo straight away, so it is never a screen of empty grey squares while they arrive.',
      'Handwriting is real handwriting at last — in Russian too. It has quietly been the same serif as everything else this whole time.',
      'A page you tear out stays torn out. It used to come back.',
      'Starting a new album opens it, instead of leaving you standing in front of the shelf.',
      'If something does not save, it says so now, instead of telling you it saved.',
      'The albums we had were cleared out — they were built while the book underneath them kept changing, and they had the scars. Every daily photo and every bouquet is untouched.',
    ],
  },
  {
    // Shipped 19 August 2026, announced on the 21st alongside the album.
    title: 'Your classroom',
    date: '2026-08-19',
    lines: [
      'Russian is a real course now. You build it the way you would at work: units, lessons inside them, and each lesson can be homework or an exam with a date on it.',
      'You write a lesson out of pieces — a paragraph, a list of words, a video, a question — and you can move them around until it reads right.',
      'Eight kinds of question: choose one, choose several, type it, fill the gaps, put the words in order, match the pairs, listen and write, or say it out loud.',
      'For the listening ones you record what he hears, in your own voice.',
      'When there is more than one right way to say something, write them all with a slash and he gets it right whichever one he picks.',
      'Tables, for the cases — you type the endings in rows and they come out as a proper grid.',
      'Nothing reaches him until you decide it is ready. When you hand a lesson over, his phone tells him.',
      'You can see what he answered and what he got wrong, mark it out of a hundred, and leave him a note — he sees both on the lesson.',
      'Where the stress falls is part of the word now. Write спаси́бо once, with the accent key on the Russian keyboard, and it shows everywhere that word appears.',
      'A word can carry a note and some tags, for the ones no single translation really covers.',
      'The alphabet is here — all thirty-three letters, what each one sounds like, and a word that uses it. You can record each one in your own voice.',
      'A dictionary that keeps growing. Every word is written once, so fixing it fixes it everywhere. Search it, hear it, add to it — and record it without leaving the lesson you are writing.',
      'Practice always makes room for the words you taught today, instead of burying them under everything already due.',
      'Everything you write can carry English AND Spanish. Write it once with English and it already works; add the Spanish whenever you like and the same lesson teaches you too.',
      'The recordings finally work. Anything either of us records now plays properly on the other one’s phone — it never really did before.',
      'Building lessons on a laptop or a tablet has room to breathe now, instead of a narrow phone column. And the app will turn sideways.',
      'The album has a photo library. Add twenty photos at once, then tap any of them to drop it on the page you have open.',
      'One of our daily polaroids can go into a book again.',
      'Taking a photo off a page no longer throws the photo away — it goes back to the strip under the book. And if you did not mean to, there is an Undo.',
      'You can bring a photo to the front or send it behind the others, whenever you like.',
      'Any photo can become a polaroid, with your own words underneath, in the size and the lettering you choose.',
      'Photos keep their real shape instead of being squashed into squares.',
      'The page curl is not cut off at the top and bottom any more.',
      'The album opens much faster, and the pages you are about to turn to are ready before you get there.',
      'Every album can have its own name, its dates and its cover, and each page can be titled.',
      'Photos land beside each other on the page now, each one tilted a little, instead of all on the same spot with only the last one showing.',
      'A wide photo and a tall one take up the same room on the page, so two of them side by side look like a pair.',
      'The shelf, the page and the little buttons all had a tidy-up.',
      'The app updates itself when you open it, so you always have the newest one without doing anything.',
      'Taking things off a page tells you once, not six times over — and one Undo puts the whole lot back.',
      'You can turn the page while you are arranging it, so a photo can go on the next one without leaving what you were doing.',
      'Photos you added before all this show up properly again instead of as a thin line.',
      'Settings now tells you exactly which version of the app you are holding — and if your phone is still on an older one, a button to take the newest right away.',
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

/** What she is allowed to see: everything that has been announced. */
export const CHANGELOG: ChangelogEntry[] = ALL_ENTRIES.filter((e) => !e.held);

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

/**
 * Has the release of this date been told to her yet?
 *
 * For the things that announce themselves: a new widget on the home screen
 * says "something changed" louder than the modal does, and the home screen is
 * the one she cannot avoid. Anything like that asks here first, so the whole
 * release still arrives on the single word he gives this file.
 */
export function isAnnounced(date: string): boolean {
  return CHANGELOG.some((e) => e.date === date);
}
