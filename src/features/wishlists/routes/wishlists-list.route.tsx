import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Empty,
  Fab,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useWishlists } from '../api/wishlists.queries';
import { useCreateWishlist } from '../api/wishlists.mutations';
import { WishlistCard } from '../components/wishlist-card';

const schema = z.object({
  title: z.string().min(1, 'Give it a name'),
  category: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function WishlistsListRoute() {
  useTableSync('wishlists', qk.wishlists.list());
  const { data, isLoading, isError } = useWishlists();
  const create = useCreateWishlist();
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category: '', description: '' },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        title: v.title,
        category: v.category || null,
        description: v.description || null,
      });
      toast.success('List created');
      reset();
      setCreating(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create');
    }
  });

  return (
    <div>
      <PageHeader title="Wishlists" subtitle="Swipe together" />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="💚"
          title="No wishlists yet"
          hint="Tap + to start a list you'll swipe through together."
        />
      ) : (
        <div className="space-y-3">
          {data.map((list) => (
            <WishlistCard key={list.id} list={list} />
          ))}
        </div>
      )}

      <Fab label="New wishlist" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New wishlist"
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="Movies to watch" {...register('title')} />
          </Field>
          <Field label="Category">
            <Input placeholder="optional" {...register('category')} />
          </Field>
          <Field label="Description">
            <Textarea placeholder="optional" {...register('description')} />
          </Field>
          <Button full type="submit" disabled={isSubmitting}>
            Create list
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
