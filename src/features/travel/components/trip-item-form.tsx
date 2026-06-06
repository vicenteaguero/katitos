import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Select, Textarea, toast } from '@kernel/ui';
import { useAddTripItem } from '../api/travel.mutations';
import { TRIP_ITEM_KINDS, type TripItemKind } from '../types';

const KIND_VALUES = TRIP_ITEM_KINDS.map((k) => k.kind) as [
  TripItemKind,
  ...TripItemKind[],
];

const schema = z.object({
  title: z.string().min(1, 'Give it a title'),
  kind: z.enum(KIND_VALUES),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export function TripItemForm({
  tripId,
  onDone,
}: {
  tripId: string;
  onDone: () => void;
}) {
  const add = useAddTripItem();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', kind: 'idea', description: '', link: '' },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await add.mutateAsync({
        tripId,
        kind: v.kind,
        title: v.title,
        description: v.description || null,
        link: v.link || null,
      });
      toast.success('Item added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="Visit the glacier" {...register('title')} />
          </Field>
        </div>
        <Field label="Kind">
          <Select {...register('kind')}>
            {TRIP_ITEM_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.emoji} {k.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea placeholder="optional" {...register('description')} />
      </Field>
      <Field label="Link" error={errors.link?.message}>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://…"
          {...register('link')}
        />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add item
      </Button>
    </form>
  );
}
