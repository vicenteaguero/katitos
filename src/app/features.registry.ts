import { createFeatureRegistry, type FeatureModule } from '@kernel/registry';

// ── Feature modules ────────────────────────────────────────────────────────
// Adding a feature = import its barrel and add it to this array. Nothing else
// in the shell changes - routes and nav are derived from the registry.
import { polaroidFeature } from '@features/polaroid';
import { quizzesFeature } from '@features/quizzes';
import { chalkboardFeature } from '@features/chalkboard';
import { presenceFeature } from '@features/presence';
import { currencyFeature } from '@features/currency';
import { flowersFeature } from '@features/flowers';
import { datesFeature } from '@features/dates';
import { summerFeature } from '@features/summer';
import { scavengerFeature } from '@features/scavenger';
import { wishlistsFeature } from '@features/wishlists';
import { languageFeature } from '@features/language';
import { treeFeature } from '@features/tree';
import { knowMeFeature } from '@features/know-me';
import { albumFeature } from '@features/album';
import { vpnFeature } from '@features/vpn';

// ── Drawer categories ──────────────────────────────────────────────────────
// Section each feature appears under in the "More" drawer (id → category).
const categories: Record<string, string> = {
  // Play
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
  tree: 'Pololos',
  presence: 'Pololos',
  // Utilities
  wishlists: 'Utilities',
  currency: 'Utilities',
  language: 'Utilities',
  chalkboard: 'Utilities',
  vpn: 'Utilities',
};

const modules: FeatureModule[] = [
  treeFeature,
  knowMeFeature,
  albumFeature,
  polaroidFeature,
  quizzesFeature,
  datesFeature,
  summerFeature,
  chalkboardFeature,
  presenceFeature,
  scavengerFeature,
  wishlistsFeature,
  languageFeature,
  currencyFeature,
  flowersFeature,
  vpnFeature,
];

// ── Demo gate ──────────────────────────────────────────────────────────────
// Only the OPEN set is reachable; the rest stay greyed "Soon" rows in the
// More drawer (shipped but not open). Flip `GATED` to false to open everything.
const GATED = true;
const OPEN = new Set([
  'polaroid',
  'album', // "Albums" - one book per era of ours; took Summer's nav slot
  'language',
  'chalkboard', // "The wall"
  'currency',
  'wishlists', // gift lists, each item with its own eye
  'flowers', // a bouquet a month, hers to fill
  'vpn', // "Internet" - Helsinki is up and reporting in
  // 'summer'   - Türkiye/Georgia is over. Locked, NOT deleted: the code, the
  //              tables and the photos all stay, so the next trip is one line.
  // 'know-me'  - the daily questions still need some love before she sees them.
  // 'scavenger' - "Date cards" frozen as-is until we rethink it.
]);

export const features: FeatureModule[] = modules.map((m) => ({
  category: categories[m.id],
  ...m,
  locked: GATED && !OPEN.has(m.id),
}));

export const featureRegistry = createFeatureRegistry(features);
