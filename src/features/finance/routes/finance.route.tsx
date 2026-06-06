import { useState } from 'react';
import { Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { Empty, Fab, LoadingScreen, PageHeader, Sheet } from '@kernel/ui';
import { useGoals } from '../api/finance.queries';
import { GoalCard } from '../components/goal-card';
import { GoalForm } from '../components/goal-form';
import { GoalDetail } from '../components/goal-detail';
import type { GoalWithContribs } from '../types';

export function FinanceRoute() {
  useTableSync('finance_goals', qk.finance.goals());
  useTableSync('finance_contributions', qk.finance.goals());

  const { data, isLoading, isError } = useGoals();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<GoalWithContribs | null>(null);

  // Keep the open detail in sync with refreshed goal data.
  const detailGoal = selected
    ? (data?.find((g) => g.id === selected.id) ?? selected)
    : null;

  return (
    <div>
      <PageHeader title="Finance" subtitle="Saving for us" />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="🐷"
          title="No goals yet"
          hint="Tap + to start saving for something."
        />
      ) : (
        <div className="space-y-3">
          {data.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={setSelected} />
          ))}
        </div>
      )}

      <Fab label="New goal" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New goal"
      >
        <GoalForm onDone={() => setCreating(false)} />
      </Sheet>

      <Sheet
        open={!!detailGoal}
        onClose={() => setSelected(null)}
        title={detailGoal?.title}
      >
        {detailGoal && <GoalDetail goal={detailGoal} />}
      </Sheet>
    </div>
  );
}
