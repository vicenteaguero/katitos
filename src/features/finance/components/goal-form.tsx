import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Select, Textarea, toast } from '@kernel/ui';
import { useCreateGoal } from '../api/finance.mutations';

const CURRENCIES = ['USD', 'CLP', 'RUB'] as const;

const schema = z.object({
  title: z.string().min(1, 'Give it a name'),
  target_amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => Number(v) > 0, 'Must be more than 0'),
  currency: z.enum(CURRENCIES),
  target_date: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GoalForm({ onDone }: { onDone: () => void }) {
  const create = useCreateGoal();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      target_amount: '',
      currency: 'USD',
      target_date: '',
      notes: '',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        title: v.title,
        target_amount: Number(v.target_amount),
        currency: v.currency,
        target_date: v.target_date || null,
        notes: v.notes || null,
      });
      toast.success('Goal added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Goal" error={errors.title?.message}>
        <Input placeholder="Visit to Russia" {...register('title')} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Field label="Target" error={errors.target_amount?.message}>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="5000"
              {...register('target_amount')}
            />
          </Field>
        </div>
        <Field label="Currency" error={errors.currency?.message}>
          <Select {...register('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Target date" error={errors.target_date?.message}>
        <Input type="date" {...register('target_date')} />
      </Field>
      <Field label="Notes">
        <Textarea placeholder="optional" {...register('notes')} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add goal
      </Button>
    </form>
  );
}
