import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DateTime } from '@kernel/lib';
import { Button, Field, Input, Select, toast } from '@kernel/ui';
import { useCreateDate } from '../api/dates.mutations';
import type { DateStatus } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Give it a title'),
  place: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['idea', 'scheduled', 'done', 'cancelled']),
  scheduled_local: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const toISO = (local: string): string =>
  DateTime.fromISO(local).toISO() ?? new Date(local).toISOString();

export function DateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const create = useCreateDate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      place: '',
      category: '',
      status: 'idea',
      scheduled_local: '',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      const id = await create.mutateAsync({
        title: v.title,
        place: v.place || null,
        category: v.category || null,
        status: v.status as DateStatus,
        scheduled_at: v.scheduled_local ? toISO(v.scheduled_local) : null,
      });
      toast.success('Date added');
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Title" error={errors.title?.message}>
        <Input placeholder="Sunset picnic" {...register('title')} />
      </Field>
      <Field label="Place">
        <Input placeholder="Parque Bicentenario" {...register('place')} />
      </Field>
      <Field label="Category">
        <Input
          placeholder="Outdoors, dinner, movie…"
          {...register('category')}
        />
      </Field>
      <Field label="Status" error={errors.status?.message}>
        <Select {...register('status')}>
          <option value="idea">Idea</option>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
      <Field label="When" hint="Optional — for scheduled dates">
        <Input type="datetime-local" {...register('scheduled_local')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add date
      </Button>
    </form>
  );
}
