import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Textarea, toast } from '@kernel/ui';
import { useCreateIdea, useUpdateIdea } from '../api/ideas.mutations';
import type { Idea } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Give it a title'),
  description: z.string().optional(),
  category: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function IdeaForm({
  initial,
  onDone,
}: {
  initial?: Idea;
  onDone: () => void;
}) {
  const create = useCreateIdea();
  const update = useUpdateIdea();
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
          category: initial.category ?? '',
        }
      : { title: '', description: '', category: '' },
  });

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title,
      description: v.description || null,
      category: v.category || null,
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
      <Field label="Title" error={errors.title?.message}>
        <Input
          placeholder="Plan a virtual movie night"
          {...register('title')}
        />
      </Field>
      <Field label="Category">
        <Input placeholder="optional" {...register('category')} />
      </Field>
      <Field label="Description">
        <Textarea placeholder="optional" {...register('description')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        {initial ? 'Save' : 'Add idea'}
      </Button>
    </form>
  );
}
