import type { Tables } from '@kernel/supabase';

export type AlbumChapter = Tables<'album_chapters'>;
export type AlbumSlot = Tables<'album_slots'>;
export type AlbumSticker = Tables<'album_stickers'>;

/** Duo half resolved for the current user from couple role / sorted fallback. */
export type DuoHalf = 'a' | 'b';
export type StickerHalf = 'solo' | 'a' | 'b';
