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
    <div className="space-y-3">
      {matches.map((item) => (
        <Card key={item.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span aria-hidden>💚</span>
            <h3 className="truncate font-semibold text-fg">{item.title}</h3>
          </div>
          {item.description && (
            <p className="text-sm text-muted">{item.description}</p>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent underline"
            >
              <ExternalLink className="h-4 w-4" /> Open link
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
