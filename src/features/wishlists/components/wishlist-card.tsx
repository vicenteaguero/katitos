import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import { Badge, Card, IconButton, toast } from '@kernel/ui';
import { useDeleteWishlist } from '../api/wishlists.mutations';
import type { Wishlist } from '../types';

export function WishlistCard({ list }: { list: Wishlist }) {
  const del = useDeleteWishlist();

  const handleDelete = () => {
    if (confirm(`Delete "${list.title}"?`)) {
      del.mutate(list.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <Card className="lift-press flex items-center justify-between gap-4">
      <span
        aria-hidden
        className="-my-7 -ml-7 mr-1 w-px self-stretch bg-brown"
      />
      <Link to={`/wishlists/${list.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h3 className="truncate font-display text-2xl font-medium tracking-tight text-fg">
            {list.title}
          </h3>
          {list.category && <Badge tone="accent">{list.category}</Badge>}
        </div>
        {list.description && (
          <p className="mt-2 truncate font-sans text-sm leading-relaxed text-muted">
            {list.description}
          </p>
        )}
      </Link>
      <IconButton
        label="Delete"
        className="shrink-0"
        onClick={handleDelete}
        disabled={del.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </Card>
  );
}
