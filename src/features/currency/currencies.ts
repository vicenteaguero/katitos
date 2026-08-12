/**
 * The bench now lives in `@kernel/lib` so Settings and the wishlists can read
 * it too — features may not import each other. Re-exported here so the
 * currency screens keep their local vocabulary.
 */
export {
  CURRENCIES,
  ANCHORS,
  currencyMeta as meta,
  isCurrencyCode as isCode,
  type Code,
} from '@kernel/lib';
