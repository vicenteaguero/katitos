import { useMemo, useState } from 'react';
import { useTableSync } from '@kernel/realtime';
import { useUserId, usePartner } from '@kernel/auth';
import { useCouple } from '@kernel/couple';
import { useLocalStorage, useNow } from '@kernel/hooks';
import { qk } from '@kernel/query';
import { LoadingScreen, PageHeader } from '@kernel/ui';
import {
  useAlbumChapters,
  useAlbumProgress,
  useAlbumSlots,
  useAlbumStickers,
} from '../api/album.queries';
import { buildPageList, dayOfYear } from '../lib/progression';
import { resolveSelfHalf } from '../lib/duo';
import { AlbumBook } from '../components/album-book';
import { AlbumHud } from '../components/album-hud';
import { BookControls } from '../components/book-controls';
import { FillSheet } from '../components/fill-sheet';
import { StickerZoom } from '../components/sticker-zoom';
import type { AlbumProgress, Page } from '../lib/progression';
import type { AlbumSlot, AlbumSticker, StickerHalf } from '../types';
import type { AlbumPageContext } from '../components/album-page';

export function AlbumRoute() {
  // Catalog never leaks secrets — publish all three for live updates.
  useTableSync('album_stickers', qk.album.stickers());
  useTableSync('album_slots', qk.album.slots());
  useTableSync('album_chapters', qk.album.chapters());

  const userId = useUserId();
  const { self, partner } = usePartner();
  useCouple();
  const now = useNow(60_000);

  const { data: chapters, isLoading: chLoading } = useAlbumChapters();
  const { data: slots, isLoading: slLoading } = useAlbumSlots();
  const { data: stickers } = useAlbumStickers();
  const progress: AlbumProgress | undefined = useAlbumProgress();

  const [spread, setSpread] = useLocalStorage('album:spread', 0);

  // Which slot is being filled / zoomed.
  const [fillSlotId, setFillSlotId] = useState<string | null>(null);
  const [zoomSticker, setZoomSticker] = useState<AlbumSticker | null>(null);

  const selfHalf = resolveSelfHalf(
    userId,
    self?.role,
    partner?.user_id,
    partner?.role
  );
  const partnerName = partner?.display_name ?? 'your partner';
  const selfName = self?.display_name ?? 'Someone';
  const todayDoy = dayOfYear(now);

  const pages: Page[] = useMemo(
    () => buildPageList(chapters ?? [], slots ?? []),
    [chapters, slots]
  );
  const maxSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);

  const slotsById = useMemo(() => {
    const m = new Map<string, AlbumSlot>();
    for (const s of slots ?? []) m.set(s.id, s);
    return m;
  }, [slots]);

  const stickersBySlot = stickers?.bySlot ?? new Map<string, AlbumSticker[]>();

  // Spread index of a chapter's divider page.
  const jumpToChapter = (chapterId: string) => {
    const idx = pages.findIndex(
      (p) => p.kind === 'divider' && p.chapterId === chapterId
    );
    if (idx >= 0) setSpread(Math.floor(idx / 2));
  };

  // Tap a slot: open zoom if there's a sticker to show, else open fill.
  const onTapSlot = (slotId: string) => {
    const slot = slotsById.get(slotId);
    if (!slot) return;
    const halves = stickersBySlot.get(slotId) ?? [];
    if (slot.is_duo) {
      // Tap shows your half's sticker if present, else lets you add it.
      const mine = halves.find((h) => h.half === selfHalf);
      if (mine) setZoomSticker(mine);
      else setFillSlotId(slotId);
      return;
    }
    const solo = halves.find((h) => h.half === 'solo');
    if (solo) setZoomSticker(solo);
    else setFillSlotId(slotId);
  };

  const fillSlot = fillSlotId ? (slotsById.get(fillSlotId) ?? null) : null;
  const fillHalf: StickerHalf = fillSlot?.is_duo ? selfHalf : 'solo';

  const ctx: AlbumPageContext = {
    chapters: chapters ?? [],
    slotsById,
    stickersBySlot,
    todayDoy,
    selfHalf,
    partnerName,
    progress,
    onTapSlot,
    onJumpChapter: jumpToChapter,
  };

  // For zoom: figure out the missing half hint isn't needed here; author label.
  const zoomAuthorName =
    zoomSticker?.created_by === userId ? selfName : partnerName;

  if (chLoading || slLoading) return <LoadingScreen />;

  return (
    <div className="curtain-reveal space-y-7">
      <PageHeader title="Pololini Album" subtitle="Our life in stickers" />

      <AlbumHud progress={progress} spread={spread} maxSpread={maxSpread} />

      <AlbumBook
        pages={pages}
        spread={Math.min(spread, maxSpread)}
        setSpread={setSpread}
        ctx={ctx}
      />

      <BookControls
        spread={Math.min(spread, maxSpread)}
        maxSpread={maxSpread}
        onPrev={() => setSpread(Math.max(0, spread - 1))}
        onNext={() => setSpread(Math.min(maxSpread, spread + 1))}
        chapters={chapters ?? []}
        onJumpChapter={jumpToChapter}
      />

      <FillSheet
        open={!!fillSlot}
        onClose={() => setFillSlotId(null)}
        slot={fillSlot}
        half={fillHalf}
        selfName={selfName}
      />

      {zoomSticker && (
        <StickerZoom
          sticker={zoomSticker}
          authorName={zoomAuthorName}
          onClose={() => setZoomSticker(null)}
          onSwap={() => {
            const slotId = zoomSticker.slot_id;
            setZoomSticker(null);
            setFillSlotId(slotId);
          }}
        />
      )}
    </div>
  );
}
