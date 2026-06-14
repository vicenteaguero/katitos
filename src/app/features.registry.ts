import { createFeatureRegistry, type FeatureModule } from '@kernel/registry';

// ── Feature modules ────────────────────────────────────────────────────────
// Adding a feature = import its barrel and add it to this array. Nothing else
// in the shell changes — routes and nav are derived from the registry.
import { countdownsFeature } from '@features/countdowns';
import { polaroidFeature } from '@features/polaroid';
import { quizzesFeature } from '@features/quizzes';
import { chalkboardFeature } from '@features/chalkboard';
import { presenceFeature } from '@features/presence';
import { gamesFeature } from '@features/games';
import { daysTogetherFeature } from '@features/days-together';
import { distanceFeature } from '@features/distance';
import { timezoneFeature } from '@features/timezone';
import { currencyFeature } from '@features/currency';
import { punitoFeature } from '@features/punito';
import { decisionsFeature } from '@features/decisions';
import { babyNamesFeature } from '@features/baby-names';
import { cuteWordsFeature } from '@features/cute-words';
import { ideaBankFeature } from '@features/idea-bank';
import { fightTimerFeature } from '@features/fight-timer';
import { flowersFeature } from '@features/flowers';
import { financeFeature } from '@features/finance';
import { travelFeature } from '@features/travel';
import { datesFeature } from '@features/dates';
import { georgiaFeature } from '@features/georgia';
import { scavengerFeature } from '@features/scavenger';
import { wishlistsFeature } from '@features/wishlists';
import { languageFeature } from '@features/language';
import { treeFeature } from '@features/tree';
import { knowMeFeature } from '@features/know-me';
import { albumFeature } from '@features/album';

// ── Drawer categories ──────────────────────────────────────────────────────
// Section each feature appears under in the "More" drawer (id → category).
const categories: Record<string, string> = {
  // Play
  games: 'Play',
  quizzes: 'Play',
  'know-me': 'Play',
  scavenger: 'Play',
  decisions: 'Play',
  // Memories
  album: 'Memories',
  polaroid: 'Memories',
  dates: 'Memories',
  georgia: 'Memories',
  travel: 'Memories',
  flowers: 'Memories',
  // Us
  tree: 'Us',
  'days-together': 'Us',
  distance: 'Us',
  timezone: 'Us',
  presence: 'Us',
  'fight-timer': 'Us',
  punito: 'Us',
  'baby-names': 'Us',
  'cute-words': 'Us',
  // Practical
  countdowns: 'Practical',
  wishlists: 'Practical',
  'idea-bank': 'Practical',
  finance: 'Practical',
  currency: 'Practical',
  language: 'Practical',
  chalkboard: 'Practical',
};

const modules: FeatureModule[] = [
  treeFeature,
  knowMeFeature,
  albumFeature,
  polaroidFeature,
  countdownsFeature,
  quizzesFeature,
  datesFeature,
  georgiaFeature,
  chalkboardFeature,
  presenceFeature,
  gamesFeature,
  scavengerFeature,
  wishlistsFeature,
  languageFeature,
  daysTogetherFeature,
  distanceFeature,
  timezoneFeature,
  currencyFeature,
  flowersFeature,
  fightTimerFeature,
  punitoFeature,
  decisionsFeature,
  babyNamesFeature,
  cuteWordsFeature,
  ideaBankFeature,
  financeFeature,
  travelFeature,
];

// ── Demo gate ──────────────────────────────────────────────────────────────
// Only the OPEN set is reachable; the rest stay greyed "Soon" rows in the
// More drawer (shipped but not open). Flip `GATED` to false to open everything.
const GATED = true;
const OPEN = new Set([
  'polaroid',
  'georgia',
  'language',
  'chalkboard', // "The wall"
  'know-me',
  'currency',
  'scavenger', // "Date cards" — the Georgia envelope deck
]);

export const features: FeatureModule[] = modules.map((m) => ({
  category: categories[m.id],
  ...m,
  locked: GATED && !OPEN.has(m.id),
}));

export const featureRegistry = createFeatureRegistry(features);
