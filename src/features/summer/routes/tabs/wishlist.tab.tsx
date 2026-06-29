import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Button, Card, Checkbox, Empty, IconButton, Input } from '@kernel/ui';
import { useSummerItems } from '../../api/summer.queries';
import {
  useAddItem,
  useDeleteItem,
  useToggleItem,
} from '../../api/summer.mutations';
import { type CountryFilter, type Trip } from '../../types';

/** Wishlist — quick, undated "to do / eat / buy" items. Its own tab now. */
export function WishlistTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_items', qk.trips.items(trip.id), { enabled: true });
  const { data: items } = useSummerItems(trip.id);
  const addItem = useAddItem();
  const delItem = useDeleteItem();
  const toggleItem = useToggleItem();
  const [wish, setWish] = useState('');

  const wishes = (items ?? []).filter(
    (it) => it.kind === 'wish' && (country === 'all' || it.country === country)
  );

  const addWish = () => {
    if (!wish.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        kind: 'wish',
        title: wish.trim(),
        country: country === 'all' ? null : country,
      },
      { onSuccess: () => setWish('') }
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWish()}
          placeholder="Item's name"
        />
        <Button onClick={addWish} className="shrink-0 px-4">
          <Plus size={16} />
        </Button>
      </div>
      {wishes.length === 0 ? (
        <Empty title="Wishlist's empty" />
      ) : (
        wishes.map((it) => (
          <Card key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox
              checked={it.status === 'done'}
              onChange={() =>
                toggleItem.mutate({
                  id: it.id,
                  tripId: trip.id,
                  status: it.status === 'done' ? 'open' : 'done',
                })
              }
              label="Toggle"
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate font-display text-base text-fg',
                it.status === 'done' && 'text-muted line-through'
              )}
            >
              {it.title}
            </span>
            <IconButton
              label="Delete"
              onClick={() => delItem.mutate({ id: it.id, tripId: trip.id })}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </Card>
        ))
      )}
    </section>
  );
}
