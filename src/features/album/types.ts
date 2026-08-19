import type { Tables } from '@kernel/supabase';

/* ── PhotoBook3D engine (shared Pololini + Summer Panini) ─────────────────── */

export type BookScope = 'life' | 'trip';
export type PhotoSource = 'upload' | 'polaroid' | 'text';

export type AlbumBook = Tables<'album_books'>;
/** A photo in the book's library — it exists whether or not it is on a page. */
export type AlbumPhoto = Tables<'album_photos'>;
/** Where a photo (or a piece of text) sits on one page. */
export type AlbumPlacement = Tables<'album_placements'>;

/** How a sticker is dressed: bare photo, or mounted on instant film. */
export type StickerFrame = 'plain' | 'polaroid';
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
}

/** A page and everything standing on it, already in back-to-front order. */
export type AlbumPageWithPhotos = Tables<'album_pages'> & {
  stickers: PlacedSticker[];
};
