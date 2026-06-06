import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Input, Select, toast } from '@kernel/ui';
import { useCreateTrip } from '../api/travel.mutations';

const CURRENCIES = ['USD', 'CLP', 'RUB'] as const;

const schema = z
  .object({
    name: z.string().min(1, 'Give the trip a name'),
    destination: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    budget_amount: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Number(v)), 'Must be a number'),
    budget_currency: z.enum(CURRENCIES),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    path: ['end_date'],
    message: 'End date is before start date',
  });

type FormValues = z.infer<typeof schema>;

export function TripForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTrip();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      destination: '',
      start_date: '',
      end_date: '',
      budget_amount: '',
      budget_currency: 'USD',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        name: v.name,
        destination: v.destination || null,
        start_date: v.start_date || null,
        end_date: v.end_date || null,
        budget_amount: v.budget_amount ? Number(v.budget_amount) : null,
        budget_currency: v.budget_currency,
      });
      toast.success('Trip added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Name" error={errors.name?.message}>
        <Input placeholder="Summer road trip" {...register('name')} />
      </Field>
      <Field label="Destination">
        <Input placeholder="Patagonia" {...register('destination')} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start date" error={errors.start_date?.message}>
          <Input type="date" {...register('start_date')} />
        </Field>
        <Field label="End date" error={errors.end_date?.message}>
          <Input type="date" {...register('end_date')} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Field label="Budget" error={errors.budget_amount?.message}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              {...register('budget_amount')}
            />
          </Field>
        </div>
        <Field label="Currency">
          <Select {...register('budget_currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button full type="submit" disabled={isSubmitting}>
        Add trip
      </Button>
    </form>
  );
}
