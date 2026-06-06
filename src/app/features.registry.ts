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

export const features: FeatureModule[] = [
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

export const featureRegistry = createFeatureRegistry(features);
