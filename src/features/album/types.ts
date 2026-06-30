import type { Tables } from '@kernel/supabase';

export type AlbumChapter = Tables<'album_chapters'>;
export type AlbumSlot = Tables<'album_slots'>;
export type AlbumSticker = Tables<'album_stickers'>;

/** Duo half resolved for the current user from couple role / sorted fallback. */
export type DuoHalf = 'a' | 'b';
export type StickerHalf = 'solo' | 'a' | 'b';

/* ── PhotoBook3D engine (shared Pololini + Summer Panini) ─────────────────── */

export type BookScope = 'life' | 'trip';
export type PhotoSource = 'upload' | 'polaroid' | 'text';

export type AlbumBook = Tables<'album_books'>;
export type AlbumPhoto = Tables<'album_photos'>;

/** A page with its photos eagerly embedded (sorted by slot, 0–3). */
export type AlbumPageWithPhotos = Tables<'album_pages'> & {
  photos: AlbumPhoto[];
};

/** Four photo slots per page (a 2×2 grid). */
export const SLOTS_PER_PAGE = 4;
