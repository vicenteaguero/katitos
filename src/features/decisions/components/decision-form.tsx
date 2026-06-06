import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Textarea, toast } from '@kernel/ui';
import { useCreateDecision } from '../api/decisions.mutations';

const schema = z.object({
  topic: z.string().min(1, 'What are we deciding?'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function DecisionForm({ onDone }: { onDone: () => void }) {
  const create = useCreateDecision();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { topic: '', description: '' },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        topic: v.topic,
        description: v.description || null,
      });
      toast.success('Saved');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Topic" error={errors.topic?.message}>
        <Input placeholder="How many kids?" {...register('topic')} />
      </Field>
      <Field label="Description">
        <Textarea placeholder="optional context" {...register('description')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add decision
      </Button>
    </form>
  );
}
