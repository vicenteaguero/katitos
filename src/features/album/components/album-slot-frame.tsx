import { Lock, Plus } from 'lucide-react';
import { cn } from '@kernel/lib';
import { isGateOpen } from '../lib/progression';
import { AlbumStickerImage } from './album-sticker-image';
import type { AlbumSlot, AlbumSticker, DuoHalf } from '../types';

const TIER_BADGE: Record<string, string> = {
  rare: 'bg-blue-500/80 text-white',
  foil: 'bg-amber-400/90 text-black',
};

/** Did this sticker land within the last few seconds? → play the peel anim. */
function isFresh(s: AlbumSticker | undefined): boolean {
  if (!s) return false;
  const t = Date.parse(s.created_at);
  return Number.isFinite(t) && Date.now() - t < 4000;
}

function HalfTile({
  sticker,
  foil,
  missingLabel,
}: {
  sticker?: AlbumSticker;
  foil: boolean;
  missingLabel?: string;
}) {
  if (!sticker) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded bg-surface-2 text-center text-[10px] text-muted">
        {missingLabel ?? '—'}
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded">
      <AlbumStickerImage
        path={sticker.image_path}
        className={cn(
          'h-full w-full object-cover',
          isFresh(sticker) && 'album-stick'
        )}
      />
      {foil && (
        <div className="album-foil pointer-events-none absolute inset-0" />
      )}
    </div>
  );
}

export function AlbumSlotFrame({
  slot,
  stickers,
  todayDoy,
  selfHalf,
  partnerName,
  onTap,
}: {
  slot: AlbumSlot;
  stickers: AlbumSticker[];
  todayDoy: number;
  selfHalf: DuoHalf;
  partnerName: string;
  onTap: () => void;
}) {
  const gated = slot.gate_start_doy != null && slot.gate_end_doy != null;
  const open = isGateOpen(
    {
      id: slot.id,
      chapter_id: slot.chapter_id,
      position: slot.position,
      tier: slot.tier,
      is_duo: slot.is_duo,
      gate_start_doy: slot.gate_start_doy,
      gate_end_doy: slot.gate_end_doy,
    },
    todayDoy
  );
  const locked = gated && !open;
  const foil = slot.tier === 'foil';

  const byHalf = (h: string) => stickers.find((s) => s.half === h);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={locked}
      className={cn(
        'group relative flex flex-col gap-1 rounded-lg border p-1.5 text-left transition',
        locked
          ? 'border-border bg-surface-2/60 opacity-70'
          : 'border-dashed border-border hover:border-accent'
      )}
    >
      {/* Tier badge */}
      {TIER_BADGE[slot.tier] && (
        <span
          className={cn(
            'absolute right-1 top-1 z-10 rounded px-1 text-[9px] font-bold uppercase',
            TIER_BADGE[slot.tier]
          )}
        >
          {slot.tier}
        </span>
      )}
      {/* Lock badge */}
      {locked && (
        <span className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
          <Lock size={9} /> {slot.gate_label ?? 'Locked'}
        </span>
      )}

      {slot.is_duo ? (
        <div className="grid grid-cols-2 gap-1">
          <HalfTile
            sticker={byHalf('a')}
            foil={foil}
            missingLabel={
              selfHalf === 'a' ? 'Add yours' : `Waiting for ${partnerName}`
            }
          />
          <HalfTile
            sticker={byHalf('b')}
            foil={foil}
            missingLabel={
              selfHalf === 'b' ? 'Add yours' : `Waiting for ${partnerName}`
            }
          />
        </div>
      ) : byHalf('solo') ? (
        <HalfTile sticker={byHalf('solo')} foil={foil} />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded bg-surface-2/40 text-muted">
          {!locked && <Plus size={20} />}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-fg">
          {slot.title}
        </p>
        {slot.hint && (
          <p className="truncate text-[10px] text-muted">{slot.hint}</p>
        )}
      </div>
    </button>
  );
}
