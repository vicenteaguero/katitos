import type { Tables } from '@kernel/supabase';
export type { StickerShape } from './components/photo-book/sticker-math';

/* ── PhotoBook3D engine (shared Pololini + Summer Panini) ─────────────────── */

export type BookScope = 'life' | 'trip';
export type PhotoSource = 'upload' | 'polaroid' | 'text';

export type AlbumBook = Tables<'album_books'>;
/** A photo in the book's library — it exists whether or not it is on a page. */
export type AlbumPhoto = Tables<'album_photos'>;
/** Where a photo (or a piece of text) sits on one page. */
export type AlbumPlacement = Tables<'album_placements'>;

/**
 * How a sticker is dressed.
 *
 * `plain` is kept as a synonym of `white` — it is what the old build writes,
 * and it will keep writing it for one more session.
 */
export type StickerFrame =
  | 'none'
  | 'plain'
  | 'white'
  | 'polaroid'
  | 'gilt'
  | 'tape'
  | 'shadow';

/** What the mount around a photo is made of. */
export type FrameColor = 'cream' | 'white' | 'gold' | 'wine' | 'ink' | 'kraft';

/** What the covers are bound in. */
export type CoverMaterial = 'leather' | 'linen' | 'kraft' | 'velvet';

/** What the pages are made of. */
export type PaperStock = 'cream' | 'ivory' | 'kraft' | 'charcoal';
/** The three faces a text sticker can wear. */
export type StickerFont = 'display' | 'sans' | 'hand';

/**
 * A placement with its library photo attached.
 *
 * The page needs both halves at once — where it sits (placement) and what it
 * looks like (photo) — and joining them here keeps every consumer from having
 * to remember which is which.
 */
export interface PlacedSticker extends AlbumPlacement {
  photo: AlbumPhoto | null;
  /**
   * A React key that survives the row getting its real id.
   *
   * A sticker appears the instant you tap, under a made-up id, and is swapped
   * for the database's row a moment later. Keying on `id` made that swap a
   * REMOUNT — the element was destroyed and rebuilt, which on a page you are
   * filling with two hundred photos reads as a flicker per photo. Only
   * optimistic rows carry this; everything else is keyed by its id as before.
   */
  localKey?: string;
}

/** A page and everything standing on it, already in back-to-front order. */
export type AlbumPageWithPhotos = Tables<'album_pages'> & {
  stickers: PlacedSticker[];
};
