import { useState } from 'react';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Empty,
  TopBarAdd,
  LoadingScreen,
  PageHeader,
  Sheet,
  toast,
} from '@kernel/ui';
import { useCountdowns } from '../api/countdowns.queries';
import { useDeleteCountdown } from '../api/countdowns.mutations';
import { CountdownCard } from '../components/countdown-card';
import { CountdownForm } from '../components/countdown-form';
import type { Countdown } from '../types';

export function CountdownsListRoute() {
  useTableSync('countdowns', qk.countdowns.list());
  const { data, isLoading, isError } = useCountdowns();
  const now = useNow(60_000);
  const del = useDeleteCountdown();

  // Presentation only: the soonest still-upcoming event earns the footlight.
  const featuredId = (data ?? [])
    .filter((c) => countdownTo(c.target_at, now).totalSeconds > 0)
    .reduce<Countdown | null>(
      (soonest, c) =>
        !soonest || c.target_at < soonest.target_at ? c : soonest,
      null
    )?.id;
  // undefined = sheet closed · null = creating · Countdown = editing
  const [editing, setEditing] = useState<Countdown | null | undefined>(
    undefined
  );

  const handleDelete = (c: Countdown) => {
    if (confirm(`Delete "${c.title}"?`)) {
      del.mutate(c.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="curtain-reveal space-y-8">
      <PageHeader
        title="Countdowns"
        subtitle="Counting down to the next time we're in the same room ✈️"
      />

      <section className="space-y-7">
        <p className="eyebrow">The Waiting</p>

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
            icon="⏳"
            title="No countdowns yet"
            hint="Tap + to count down to something."
          />
        ) : (
          <div className="curtain-stagger space-y-5">
            {data.map((c) => (
              <CountdownCard
                key={c.id}
                countdown={c}
                featured={c.id === featuredId}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <TopBarAdd label="Add countdown" onClick={() => setEditing(null)} />

      <Sheet
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Edit countdown' : 'New countdown'}
      >
        <CountdownForm
          initial={editing ?? undefined}
          onDone={() => setEditing(undefined)}
        />
      </Sheet>
    </div>
  );
}
