import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { Button, Field, Input, Textarea, toast } from '@kernel/ui';
import {
  useCreateCountdown,
  useUpdateCountdown,
} from '../api/countdowns.mutations';
import type { Countdown } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Give it a name'),
  target_local: z.string().min(1, 'Pick a date & time'),
  emoji: z.string().max(8).optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const toLocalInput = (iso: string) =>
  DateTime.fromISO(iso).toFormat("yyyy-LL-dd'T'HH:mm");
const toISO = (local: string) =>
  DateTime.fromISO(local).toISO() ?? new Date(local).toISOString();

export function CountdownForm({
  initial,
  onDone,
}: {
  initial?: Countdown;
  onDone: () => void;
}) {
  const create = useCreateCountdown();
  const update = useUpdateCountdown();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          title: initial.title,
          target_local: toLocalInput(initial.target_at),
          emoji: initial.emoji ?? '',
          notes: initial.notes ?? '',
        }
      : { title: '', target_local: '', emoji: '', notes: '' },
  });

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title,
      target_at: toISO(v.target_local),
      emoji: v.emoji || null,
      notes: v.notes || null,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success('Saved');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <Field label="Emoji">
          <Input maxLength={8} placeholder="✈️" {...register('emoji')} />
        </Field>
        <div className="col-span-3">
          <Field label="Name" error={errors.title?.message}>
            <Input placeholder="Georgia trip" {...register('title')} />
          </Field>
        </div>
      </div>
      <Field label="When" error={errors.target_local?.message}>
        <Input type="datetime-local" {...register('target_local')} />
      </Field>
      <Field label="Notes">
        <Textarea placeholder="optional" {...register('notes')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        {initial ? 'Save' : 'Add countdown'}
      </Button>
    </form>
  );
}
