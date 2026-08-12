import { useState } from 'react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { Empty, LoadingScreen, PageHeader, Sheet, TopBarAdd } from '@kernel/ui';
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
    <div className="curtain-reveal space-y-8">
      <PageHeader title="Finance" subtitle="A brass ledger, saving for us 🫒" />

      <section className="space-y-7">
        <p className="eyebrow">The Ledger</p>
        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : !data || data.length === 0 ? (
          <Empty
            icon="🐷"
            title="No goals yet"
            hint="Tap + to start saving for something."
          />
        ) : (
          <div className="curtain-stagger space-y-5">
            {data.map((g) => (
              <GoalCard key={g.id} goal={g} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      <TopBarAdd label="New goal" onClick={() => setCreating(true)} />

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
