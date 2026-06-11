import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { ExternalLink } from 'lucide-react';
import { Card, Empty, toast } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useVoteItem } from '../api/wishlists.mutations';
import type { WishlistItemWithVotes } from '../types';

const SWIPE_THRESHOLD = 90;

export function SwipeDeck({
  items,
  listId,
  userId,
}: {
  items: WishlistItemWithVotes[];
  listId: string;
  userId: string | null;
}) {
  const vote = useVoteItem();
  const [drag, setDrag] = useState(0);

  const pending = items.filter(
    (item) => !item.wishlist_votes.some((v) => v.user_id === userId)
  );
  const current = pending[0];

  const cast = (value: 1 | -1) => {
    if (!current) return;
    setDrag(0);
    vote.mutate(
      { itemId: current.id, listId, vote: value },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const bind = useDrag(({ active, movement: [mx], last }) => {
    if (!current) return;
    if (last) {
      if (mx > SWIPE_THRESHOLD) cast(1);
      else if (mx < -SWIPE_THRESHOLD) cast(-1);
      else setDrag(0);
      return;
    }
    setDrag(active ? mx : 0);
  });

  if (!current) {
    return (
      <Empty
        icon="🎉"
        title="All swiped!"
        hint="Check the Matches tab to see what you both liked."
      />
    );
  }

  const decided = Math.abs(drag) > SWIPE_THRESHOLD;

  return (
    <div className="flex flex-col items-center gap-7">
      <div
        {...bind()}
        style={{
          transform: `translateX(${drag}px) rotate(${drag / 20}deg)`,
          touchAction: 'pan-y',
        }}
        className="w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      >
        <Card className="relative flex min-h-[16rem] flex-col gap-4">
          {drag !== 0 && (
            <span
              className={cn(
                'absolute top-5 font-sans text-xs font-semibold uppercase tracking-[0.18em]',
                drag > 0 ? 'right-5 text-success' : 'left-5 text-danger',
                decided ? 'opacity-100' : 'opacity-50'
              )}
            >
              {drag > 0 ? 'Like' : 'Pass'}
            </span>
          )}
          <h2 className="pr-20 font-display text-4xl font-medium leading-tight tracking-tight text-fg">
            {current.title}
          </h2>
          {current.description && (
            <p className="whitespace-pre-wrap font-sans leading-relaxed text-muted">
              {current.description}
            </p>
          )}
          {current.link && (
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-auto inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-copper"
            >
              <ExternalLink className="h-4 w-4" /> Open link
            </a>
          )}
        </Card>
      </div>

      <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
        {pending.length} left to swipe
      </p>

      <div className="flex w-full gap-4">
        <button
          type="button"
          onClick={() => cast(-1)}
          disabled={vote.isPending}
          className="lift-press flex h-14 flex-1 items-center justify-center gap-2 rounded bg-surface-2 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-fg transition disabled:opacity-50"
        >
          <span aria-hidden>✖</span> Pass
        </button>
        <button
          type="button"
          onClick={() => cast(1)}
          disabled={vote.isPending}
          className="lift-press btn-catchlight flex h-14 flex-1 items-center justify-center gap-2 rounded bg-success font-sans text-sm font-semibold uppercase tracking-[0.08em] text-accent-fg transition disabled:opacity-50"
        >
          <span aria-hidden>♥</span> Like
        </button>
      </div>
    </div>
  );
}
