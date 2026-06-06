import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMembers } from '@kernel/auth';
import { formatMoney, formatDate } from '@kernel/lib';
import { Button, Empty, Field, Input, LoadingScreen, toast } from '@kernel/ui';
import { useContributions } from '../api/finance.queries';
import { useAddContribution } from '../api/finance.mutations';
import { savedFor, type GoalWithContribs } from '../types';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => Number(v) > 0, 'Must be more than 0'),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GoalDetail({ goal }: { goal: GoalWithContribs }) {
  const { data: members } = useMembers();
  const { data: contributions, isLoading, isError } = useContributions(goal.id);
  const add = useAddContribution();

  const saved = savedFor(goal);
  const target = goal.target_amount;
  const pct =
    target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', note: '' },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await add.mutateAsync({
        goalId: goal.id,
        amount: Number(v.amount),
        note: v.note || null,
      });
      reset({ amount: '', note: '' });
      toast.success('Contribution added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  const memberName = (userId: string): string =>
    members?.find((m) => m.user_id === userId)?.display_name ?? 'Someone';

  return (
    <div className="space-y-4">
      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-sm tabular-nums text-muted">
          <span className="font-semibold text-fg">
            {formatMoney(saved, goal.currency)}
          </span>{' '}
          / {formatMoney(target, goal.currency)}
          <span className="ml-1 text-accent">({pct}%)</span>
        </p>
        {goal.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
            {goal.notes}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="w-28 shrink-0">
          <Field label="Amount" error={errors.amount?.message}>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="100"
              {...register('amount')}
            />
          </Field>
        </div>
        <div className="min-w-0 flex-1">
          <Field label="Note">
            <Input placeholder="optional" {...register('note')} />
          </Field>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Add
        </Button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Contributions</h3>
        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : !contributions || contributions.length === 0 ? (
          <Empty
            icon="💸"
            title="No contributions yet"
            hint="Log the first one above."
          />
        ) : (
          <ul className="space-y-2">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded border border-border bg-surface-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{memberName(c.user_id)}</p>
                  {c.note && (
                    <p className="truncate text-xs text-muted">{c.note}</p>
                  )}
                  <p className="text-xs text-muted">
                    {formatDate(c.contributed_at)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">
                  {formatMoney(c.amount, goal.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
