import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Empty,
  Fab,
  Field,
  Input,
  LoadingScreen,
  Segmented,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import type { SegmentOption } from '@kernel/ui';
import { useWishlistItems } from '../api/wishlists.queries';
import { useAddItem } from '../api/wishlists.mutations';
import { SwipeDeck } from '../components/swipe-deck';
import { Matches } from '../components/matches';

type Tab = 'swipe' | 'matches';

const tabs: SegmentOption<Tab>[] = [
  { value: 'swipe', label: 'Swipe' },
  { value: 'matches', label: 'Matches' },
];

const schema = z.object({
  title: z.string().min(1, 'Give it a name'),
  description: z.string().optional(),
  link: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function WishlistDetailRoute() {
  const { listId } = useParams<{ listId: string }>();
  const userId = useUserId();
  const [tab, setTab] = useState<Tab>('swipe');
  const [adding, setAdding] = useState(false);

  useTableSync('wishlist_items', qk.wishlists.items(listId ?? ''), {
    enabled: !!listId,
  });
  useTableSync('wishlist_votes', qk.wishlists.items(listId ?? ''), {
    enabled: !!listId,
  });

  const { data, isLoading } = useWishlistItems(listId ?? '');
  const addItem = useAddItem();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', link: '' },
  });

  if (!listId) return <Empty icon="❓" title="No list selected" />;

  const submit = handleSubmit(async (v) => {
    try {
      await addItem.mutateAsync({
        listId,
        title: v.title,
        description: v.description || null,
        link: v.link || null,
      });
      toast.success('Item added');
      reset();
      setAdding(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    }
  });

  const items = data ?? [];

  return (
    <div className="curtain-reveal space-y-6">
      <Link
        to="/wishlists"
        className="inline-flex items-center gap-1 font-sans text-sm text-muted"
      >
        <ChevronLeft size={16} /> All wishlists
      </Link>

      <p className="eyebrow">
        {tab === 'swipe' ? 'The Audition' : 'The Programme'}
      </p>

      <Segmented options={tabs} value={tab} onChange={setTab} />

      {isLoading ? (
        <LoadingScreen />
      ) : tab === 'swipe' ? (
        <SwipeDeck items={items} listId={listId} userId={userId} />
      ) : (
        <Matches items={items} />
      )}

      <Fab label="Add item" onClick={() => setAdding(true)}>
        <Plus />
      </Fab>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add item">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="The Matrix" {...register('title')} />
          </Field>
          <Field label="Description">
            <Textarea placeholder="optional" {...register('description')} />
          </Field>
          <Field label="Link">
            <Input
              type="url"
              placeholder="https://… (optional)"
              {...register('link')}
            />
          </Field>
          <Button full type="submit" disabled={isSubmitting}>
            Add item
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
