import { ExternalLink } from 'lucide-react';
import { Card, Empty } from '@kernel/ui';
import type { WishlistItemWithVotes } from '../types';

function isMatch(item: WishlistItemWithVotes): boolean {
  const likes = item.wishlist_votes.filter((v) => v.vote === 1);
  return likes.length >= 2;
}

export function Matches({ items }: { items: WishlistItemWithVotes[] }) {
  const matches = items.filter(isMatch);

  if (matches.length === 0) {
    return (
      <Empty
        icon="💞"
        title="No matches yet"
        hint="When you both like the same thing, it shows up here."
      />
    );
  }

  return (
    <div className="curtain-stagger space-y-6">
      {matches.map((item) => (
        <Card key={item.id} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <span aria-hidden className="candle-flicker text-success">
              ♥
            </span>
            <h3 className="truncate font-display text-2xl font-medium tracking-tight text-fg">
              {item.title}
            </h3>
          </div>
          {item.description && (
            <p className="font-sans text-sm leading-relaxed text-muted">
              {item.description}
            </p>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-copper"
            >
              <ExternalLink className="h-4 w-4" /> Open link
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
