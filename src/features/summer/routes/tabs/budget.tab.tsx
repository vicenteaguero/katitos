import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { supabase } from '@kernel/supabase';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { usePartner } from '@kernel/auth';
import { convert, formatMoney, indexRates, cn, DateTime } from '@kernel/lib';
import {
  Button,
  Card,
  Empty,
  IconButton,
  Input,
  Select,
  Sheet,
  useTopBarAction,
} from '@kernel/ui';
import { useSummerLines, useSummerSprints } from '../../api/summer.queries';
import {
  useAddLine,
  useAddSprint,
  useDeleteLine,
  useDeleteSprint,
  useUpdateLine,
} from '../../api/summer.mutations';
import { TopAdd } from '../../components/top-add';
import type { BudgetLine, BudgetSprint, Trip } from '../../types';

const CURRENCIES = ['USD', 'CLP', 'RUB', 'GEL', 'TRY'];

function useRates() {
  return useQuery({
    queryKey: qk.currency.rates(),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('base, quote, rate');
      if (error) throw error;
      return data ?? [];
    },
  });
}

type LineEdit = {
  id?: string;
  sprintId: string;
  label: string;
  currency: string;
  planned: string;
  spent: string;
};

export function BudgetTab({ trip }: { trip: Trip }) {
  useTableSync('budget_sprints', qk.trips.sprints(trip.id), { enabled: true });
  useTableSync('budget_lines', ['trips', 'budget-lines'], { enabled: true });
  const { data: sprints } = useSummerSprints(trip.id);
  const sprintIds = (sprints ?? []).map((s) => s.id);
  const { data: lines } = useSummerLines(sprintIds);
  const { data: rateRows } = useRates();
  const { self } = usePartner();
  const display = self?.preferred_currency ?? 'USD';
  const rates = useMemo(() => indexRates(rateRows ?? []), [rateRows]);

  const addSprint = useAddSprint();
  const addLine = useAddLine();
  const updLine = useUpdateLine();
  const delLine = useDeleteLine();
  const delSprint = useDeleteSprint();

  const [sprintForm, setSprintForm] = useState<{
    open: boolean;
    name: string;
    anchor: string;
  }>({ open: false, name: '', anchor: '' });
  const [lineEdit, setLineEdit] = useState<LineEdit | null>(null);

  useTopBarAction(
    <TopAdd
      onClick={() => setSprintForm({ open: true, name: '', anchor: '' })}
    />,
    []
  );

  const bySprint = new Map<string, BudgetLine[]>();
  for (const l of lines ?? []) {
    const arr = bySprint.get(l.sprint_id) ?? [];
    arr.push(l);
    bySprint.set(l.sprint_id, arr);
  }

  const submitSprint = () => {
    if (!sprintForm.name.trim()) return;
    addSprint.mutate(
      {
        tripId: trip.id,
        name: sprintForm.name.trim(),
        anchorDate: sprintForm.anchor || null,
        position: sprints?.length ?? 0,
      },
      {
        onSuccess: () => setSprintForm({ open: false, name: '', anchor: '' }),
      }
    );
  };

  const submitLine = () => {
    if (!lineEdit) return;
    const planned = Number(lineEdit.planned) || 0;
    const spent = Number(lineEdit.spent) || 0;
    if (lineEdit.id) {
      updLine.mutate(
        {
          id: lineEdit.id,
          patch: {
            label: lineEdit.label || null,
            currency: lineEdit.currency,
            planned_amount: planned,
            spent_amount: spent,
          },
        },
        { onSuccess: () => setLineEdit(null) }
      );
    } else {
      addLine.mutate(
        {
          sprintId: lineEdit.sprintId,
          label: lineEdit.label || null,
          currency: lineEdit.currency,
          planned,
          spent,
        },
        { onSuccess: () => setLineEdit(null) }
      );
    }
  };

  return (
    <section className="space-y-4">
      {(sprints ?? []).length === 0 ? (
        <Empty
          icon={<Wallet className="h-11 w-11" strokeWidth={1.25} />}
          title="No sprints yet"
          hint="Group money by period — e.g. “Before Jul 26”."
        />
      ) : (
        (sprints ?? []).map((s) => (
          <SprintCard
            key={s.id}
            sprint={s}
            lines={bySprint.get(s.id) ?? []}
            rates={rates}
            display={display}
            onAddLine={() =>
              setLineEdit({
                sprintId: s.id,
                label: '',
                currency: display,
                planned: '',
                spent: '',
              })
            }
            onEditLine={(l) =>
              setLineEdit({
                id: l.id,
                sprintId: s.id,
                label: l.label ?? '',
                currency: l.currency,
                planned: String(l.planned_amount),
                spent: String(l.spent_amount),
              })
            }
            onDeleteLine={(l) => delLine.mutate({ id: l.id })}
            onDeleteSprint={() =>
              delSprint.mutate({ id: s.id, tripId: trip.id })
            }
          />
        ))
      )}

      <Sheet
        open={sprintForm.open}
        onClose={() => setSprintForm((f) => ({ ...f, open: false }))}
        title="New sprint"
      >
        <div className="space-y-3">
          <Input
            value={sprintForm.name}
            onChange={(e) =>
              setSprintForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Name — e.g. Before Jul 26"
            autoFocus
          />
          <Input
            type="date"
            value={sprintForm.anchor}
            onChange={(e) =>
              setSprintForm((f) => ({ ...f, anchor: e.target.value }))
            }
          />
          <Button full onClick={submitSprint} disabled={addSprint.isPending}>
            Add sprint
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={!!lineEdit}
        onClose={() => setLineEdit(null)}
        title={lineEdit?.id ? 'Edit line' : 'Add line'}
      >
        {lineEdit && (
          <div className="space-y-3">
            <Input
              value={lineEdit.label}
              onChange={(e) =>
                setLineEdit({ ...lineEdit, label: e.target.value })
              }
              placeholder="What for — flights, food, stay…"
              autoFocus
            />
            <Select
              value={lineEdit.currency}
              onChange={(e) =>
                setLineEdit({ ...lineEdit, currency: e.target.value })
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                inputMode="decimal"
                value={lineEdit.planned}
                onChange={(e) =>
                  setLineEdit({ ...lineEdit, planned: e.target.value })
                }
                placeholder="Planned"
              />
              <Input
                inputMode="decimal"
                value={lineEdit.spent}
                onChange={(e) =>
                  setLineEdit({ ...lineEdit, spent: e.target.value })
                }
                placeholder="Spent"
              />
            </div>
            <Button full onClick={submitLine}>
              {lineEdit.id ? 'Save' : 'Add line'}
            </Button>
          </div>
        )}
      </Sheet>
    </section>
  );
}

function SprintCard({
  sprint,
  lines,
  rates,
  display,
  onAddLine,
  onEditLine,
  onDeleteLine,
  onDeleteSprint,
}: {
  sprint: BudgetSprint;
  lines: BudgetLine[];
  rates: Map<string, number>;
  display: string;
  onAddLine: () => void;
  onEditLine: (l: BudgetLine) => void;
  onDeleteLine: (l: BudgetLine) => void;
  onDeleteSprint: () => void;
}) {
  // Combined totals converted to the display currency.
  let planTotal = 0;
  let spentTotal = 0;
  for (const l of lines) {
    planTotal += convert(l.planned_amount, l.currency, display, rates) ?? 0;
    spentTotal += convert(l.spent_amount, l.currency, display, rates) ?? 0;
  }
  const left = planTotal - spentTotal;
  const pct = planTotal > 0 ? Math.min(100, (spentTotal / planTotal) * 100) : 0;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold text-fg">
            {sprint.name}
          </p>
          {sprint.anchor_date && (
            <p className="font-sans text-[0.7rem] uppercase tracking-wide text-muted">
              until {DateTime.fromISO(sprint.anchor_date).toFormat('LLL d')}
            </p>
          )}
        </div>
        <IconButton label="Delete sprint" onClick={onDeleteSprint}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Combined meter. */}
      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between font-sans text-[0.7rem] text-muted">
          <span>{formatMoney(spentTotal, display)} spent</span>
          <span
            className={cn(
              'font-semibold',
              left < 0 ? 'text-danger' : 'text-success'
            )}
          >
            {formatMoney(left, display)} left
          </span>
        </div>
      </div>

      {/* Lines. */}
      <div className="space-y-1.5">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2 font-sans text-sm">
            <span className="min-w-0 flex-1 truncate text-fg">
              {l.label || l.currency}
            </span>
            <span className="shrink-0 text-muted">
              {formatMoney(l.spent_amount, l.currency)} /{' '}
              {formatMoney(l.planned_amount, l.currency)}
            </span>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => onEditLine(l)}
              className="shrink-0 text-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete line"
              onClick={() => onDeleteLine(l)}
              className="shrink-0 text-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Button size="sm" variant="ghost" onClick={onAddLine}>
        <Plus size={14} /> Add line
      </Button>
    </Card>
  );
}
