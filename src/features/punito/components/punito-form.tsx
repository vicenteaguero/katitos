import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Select, Textarea, toast } from '@kernel/ui';
import { useCreatePunito, useUpdatePunito } from '../api/punitos.mutations';
import type { Punito } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Give it a name'),
  description: z.string().optional(),
  level: z.enum(['soft', 'serious']),
});
type FormValues = z.infer<typeof schema>;

export function PunitoForm({
  initial,
  onDone,
}: {
  initial?: Punito;
  onDone: () => void;
}) {
  const create = useCreatePunito();
  const update = useUpdatePunito();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          title: initial.title,
          description: initial.description ?? '',
          level: initial.level === 'serious' ? 'serious' : 'soft',
        }
      : { title: '', description: '', level: 'soft' },
  });

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title,
      description: v.description || null,
      level: v.level,
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
    <form onSubmit={submit} className="space-y-7">
      <p className="eyebrow text-copper">
        {initial ? 'Amend the Promise' : 'A New Pinky Promise'}
      </p>

      <div className="space-y-5">
        <Field label="Promise" error={errors.title?.message}>
          <Input placeholder="No phones at dinner" {...register('title')} />
        </Field>
        <Field label="Details">
          <Textarea placeholder="optional" {...register('description')} />
        </Field>
        <Field label="Level" error={errors.level?.message}>
          <Select {...register('level')}>
            <option value="soft">Soft</option>
            <option value="serious">Serious</option>
          </Select>
        </Field>
      </div>

      <hr className="seam" aria-hidden="true" />

      <Button full type="submit" disabled={isSubmitting}>
        {initial ? 'Save' : 'Seal a new puñito 🤙'}
      </Button>
    </form>
  );
}
