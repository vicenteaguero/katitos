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
import { usePunitos } from '../api/punitos.queries';
import { useDeletePunito, useUpdatePunito } from '../api/punitos.mutations';
import { PunitoCard } from '../components/punito-card';
import { PunitoForm } from '../components/punito-form';
import type { Punito } from '../types';

export function PunitoListRoute() {
  useTableSync('punitos', qk.punitos.list());
  const { data, isLoading, isError } = usePunitos();
  const del = useDeletePunito();
  const update = useUpdatePunito();
  // undefined = sheet closed · null = creating · Punito = editing
  const [editing, setEditing] = useState<Punito | null | undefined>(undefined);

  const handleSeal = (p: Punito) => {
    update.mutate(
      { id: p.id, status: 'sealed', sealed_at: new Date().toISOString() },
      {
        onSuccess: () => toast.success('Sealed 🤙'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleBreak = (p: Punito) => {
    update.mutate(
      { id: p.id, status: 'broken' },
      {
        onSuccess: () => toast.success('Marked broken'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (p: Punito) => {
    if (confirm(`Delete "${p.title}"?`)) {
      del.mutate(p.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <div>
      <PageHeader title="Puñito" subtitle="Our pinky promises" />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="🤙"
          title="No puñitos yet"
          hint="Tap + to make a pinky promise."
        />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <PunitoCard
              key={p.id}
              punito={p}
              onSeal={handleSeal}
              onBreak={handleBreak}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Fab label="Add puñito" onClick={() => setEditing(null)}>
        <Plus />
      </Fab>

      <Sheet
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Edit puñito' : 'New puñito'}
      >
        <PunitoForm
          initial={editing ?? undefined}
          onDone={() => setEditing(undefined)}
        />
      </Sheet>
    </div>
  );
}
