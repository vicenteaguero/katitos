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
    <Card className="flex items-center justify-between gap-3">
      <Link to={`/wishlists/${list.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold">{list.title}</h3>
          {list.category && <Badge tone="accent">{list.category}</Badge>}
        </div>
        {list.description && (
          <p className="mt-1 truncate text-sm text-muted">{list.description}</p>
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
