import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Select, Textarea, toast } from '@kernel/ui';
import { useCreateBabyName } from '../api/baby-names.mutations';

const schema = z.object({
  name: z.string().min(1, 'Give it a name'),
  gender: z.enum(['girl', 'boy', 'any']),
  meaning: z.string().optional(),
  origin: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function BabyNameForm({ onDone }: { onDone: () => void }) {
  const create = useCreateBabyName();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      gender: 'any',
      meaning: '',
      origin: '',
      notes: '',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        name: v.name,
        gender: v.gender,
        meaning: v.meaning || null,
        origin: v.origin || null,
        notes: v.notes || null,
      });
      toast.success('Name added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="eyebrow text-purple before:bg-purple after:bg-purple">
        A name to dream on
      </p>
      <Field label="Name" error={errors.name?.message}>
        <Input placeholder="Olivia" {...register('name')} />
      </Field>
      <Field label="Gender" error={errors.gender?.message}>
        <Select {...register('gender')}>
          <option value="girl">Girl</option>
          <option value="boy">Boy</option>
          <option value="any">Any</option>
        </Select>
      </Field>
      <Field label="Meaning">
        <Input placeholder="optional" {...register('meaning')} />
      </Field>
      <Field label="Origin">
        <Input placeholder="optional" {...register('origin')} />
      </Field>
      <Field label="Notes">
        <Textarea placeholder="optional" {...register('notes')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add name
      </Button>
    </form>
  );
}
