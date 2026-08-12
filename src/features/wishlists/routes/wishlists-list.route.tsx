import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useMembers, useUserId } from '@kernel/auth';
import { Empty, Skeleton } from '@kernel/ui';
import { useWishlistCounts, useWishlists } from '../api/wishlists.queries';

/**
 * The two gift lists.
 *
 * They provision themselves on first open, so there is nothing to set up — you
 * arrive and both are already here, one with each of our names on it.
 */
export function WishlistsListRoute() {
  const { data: lists, isLoading, isError } = useWishlists();
  const { data: counts } = useWishlistCounts();
  const { data: members } = useMembers();
  const userId = useUserId();

  const nameFor = (ownerId: string | null) =>
    members?.find((m) => m.user_id === ownerId)?.display_name ?? null;

  if (isLoading) {
    return (
      <div className="curtain-reveal space-y-3">
        <Skeleton className="h-24 w-full" rounded="lg" />
        <Skeleton className="h-24 w-full" rounded="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
    );
  }

  return (
    <div className="curtain-stagger space-y-3">
      {(lists ?? []).map((list, i) => {
        const c = counts?.get(list.id);
        const forMe = list.owner_user_id === userId;
        const owner = nameFor(list.owner_user_id);
        return (
          <Link
            key={list.id}
            to={`/wishlists/${list.id}`}
            style={{ '--i': i } as React.CSSProperties}
            className="lift-press flex items-center gap-4 rounded-lg rounded-br-[1.75rem] bg-surface-2 px-5 py-4 shadow-loge"
          >
            <span className="text-3xl" aria-hidden="true">
              {list.emoji ?? '🎁'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-xl font-semibold text-fg">
                {list.title}
              </span>
              <span className="block font-sans text-xs text-muted">
                {c?.total
                  ? `${c.total} ${c.total === 1 ? 'wish' : 'wishes'}${
                      c.got ? ` · ${c.got} done` : ''
                    }`
                  : 'nothing on it yet'}
              </span>
              <span className="mt-0.5 block font-sans text-[0.6rem] uppercase tracking-[0.14em] text-copper">
                {forMe
                  ? 'what you wish for'
                  : owner
                    ? `ideas for ${owner}`
                    : 'ours'}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        );
      })}
    </div>
  );
}
