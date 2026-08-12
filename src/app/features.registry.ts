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
import { datesFeature } from '@features/dates';
import { summerFeature } from '@features/summer';
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
  // Memories
  album: 'Memories',
  polaroid: 'Memories',
  dates: 'Memories',
  summer: 'Memories',
  flowers: 'Memories',
  // Pololos
  decisions: 'Pololos',
  tree: 'Pololos',
  'days-together': 'Pololos',
  distance: 'Pololos',
  timezone: 'Pololos',
  presence: 'Pololos',
  'fight-timer': 'Pololos',
  punito: 'Pololos',
  'baby-names': 'Pololos',
  'cute-words': 'Pololos',
  // Utilities
  countdowns: 'Utilities',
  wishlists: 'Utilities',
  'idea-bank': 'Utilities',
  finance: 'Utilities',
  currency: 'Utilities',
  language: 'Utilities',
  chalkboard: 'Utilities',
};

const modules: FeatureModule[] = [
  treeFeature,
  knowMeFeature,
  albumFeature,
  polaroidFeature,
  countdownsFeature,
  quizzesFeature,
  datesFeature,
  summerFeature,
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
];

// ── Demo gate ──────────────────────────────────────────────────────────────
// Only the OPEN set is reachable; the rest stay greyed "Soon" rows in the
// More drawer (shipped but not open). Flip `GATED` to false to open everything.
const GATED = true;
const OPEN = new Set([
  'polaroid',
  'album', // "Albums" — one book per era of ours; took Summer's nav slot
  'language',
  'chalkboard', // "The wall"
  'know-me',
  'currency',
  'wishlists', // gift lists, each item with its own eye
  // 'summer'   — Türkiye/Georgia is over. Locked, NOT deleted: the code, the
  //              tables and the photos all stay, so the next trip is one line.
  // 'scavenger' — "Date cards" frozen as-is until we rethink it.
]);

export const features: FeatureModule[] = modules.map((m) => ({
  category: categories[m.id],
  ...m,
  locked: GATED && !OPEN.has(m.id),
}));

export const featureRegistry = createFeatureRegistry(features);
