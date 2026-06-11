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
        <div className="marble gilt-hairline-flat relative flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="eyebrow text-accent before:bg-accent after:bg-accent">
            Act
          </span>
          <span className="text-4xl">{ch?.emoji ?? '📖'}</span>
          <h2 className="font-display text-3xl font-semibold leading-tight text-accent">
            {ch?.title}
          </h2>
          {ch?.subtitle && (
            <p className="font-display text-base font-light italic text-brown">
              {ch.subtitle}
            </p>
          )}
        </div>
      );
    }
    case 'grid':
      return (
        <div className="marble gilt-hairline-flat grid h-full w-full grid-cols-2 grid-rows-3 gap-2 p-2.5">
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
      return <div className="marble h-full w-full" />;
  }
}
