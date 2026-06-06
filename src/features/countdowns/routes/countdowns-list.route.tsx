import { useState } from 'react';
import { Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Empty,
  Fab,
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
  const del = useDeleteCountdown();
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
    <div>
      <PageHeader title="Countdowns" subtitle="Things we're waiting for" />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="⏳"
          title="No countdowns yet"
          hint="Tap + to count down to something."
        />
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <CountdownCard
              key={c.id}
              countdown={c}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Fab label="Add countdown" onClick={() => setEditing(null)}>
        <Plus />
      </Fab>

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
