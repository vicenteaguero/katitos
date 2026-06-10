import type { Page, AlbumProgress } from '../lib/progression';
import type { AlbumChapter, AlbumSlot, AlbumSticker, DuoHalf } from '../types';
import { AlbumSlotFrame } from './album-slot-frame';
import { Cover } from './cover';
import { TableOfContents } from './table-of-contents';

export interface AlbumPageContext {
  chapters: AlbumChapter[];
  slotsById: Map<string, AlbumSlot>;
  stickersBySlot: Map<string, AlbumSticker[]>;
  todayDoy: number;
  selfHalf: DuoHalf;
  partnerName: string;
  progress?: AlbumProgress;
  onTapSlot: (slotId: string) => void;
  onJumpChapter: (chapterId: string) => void;
}

/** One physical page; dispatches on the page kind. */
export function AlbumPage({
  page,
  ctx,
}: {
  page: Page;
  ctx: AlbumPageContext;
}) {
  switch (page.kind) {
    case 'cover':
      return <Cover progress={ctx.progress} />;
    case 'toc':
      return (
        <TableOfContents
          chapters={ctx.chapters}
          progress={ctx.progress}
          onJump={ctx.onJumpChapter}
        />
      );
    case 'divider': {
      const ch = ctx.chapters.find((c) => c.id === page.chapterId);
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-surface-2 to-surface p-6 text-center">
          <span className="text-4xl">{ch?.emoji ?? '📖'}</span>
          <h2 className="text-xl font-black text-fg">{ch?.title}</h2>
          {ch?.subtitle && <p className="text-sm text-muted">{ch.subtitle}</p>}
        </div>
      );
    }
    case 'grid':
      return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-2 rounded-lg bg-surface p-2">
          {page.slotIds.map((slotId) => {
            const slot = ctx.slotsById.get(slotId);
            if (!slot) return <div key={slotId} />;
            return (
              <AlbumSlotFrame
                key={slotId}
                slot={slot}
                stickers={ctx.stickersBySlot.get(slotId) ?? []}
                todayDoy={ctx.todayDoy}
                selfHalf={ctx.selfHalf}
                partnerName={ctx.partnerName}
                onTap={() => ctx.onTapSlot(slotId)}
              />
            );
          })}
        </div>
      );
    case 'blank':
    default:
      return <div className="h-full w-full rounded-lg bg-surface" />;
  }
}
