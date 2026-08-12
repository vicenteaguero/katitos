import { useState } from 'react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Empty,
  TopBarAdd,
  LoadingScreen,
  PageHeader,
  Segmented,
  Sheet,
  toast,
} from '@kernel/ui';
import type { SegmentOption } from '@kernel/ui';
import { useIdeas } from '../api/ideas.queries';
import { useDeleteIdea } from '../api/ideas.mutations';
import { IdeaCard } from '../components/idea-card';
import { IdeaForm } from '../components/idea-form';
import type { Idea } from '../types';

type Filter = 'all' | 'idea' | 'planned' | 'done';

const FILTERS: SegmentOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' },
];

export function IdeaBankListRoute() {
  useTableSync('ideas', qk.ideas.list());
  const { data, isLoading, isError } = useIdeas();
  const del = useDeleteIdea();
  const [filter, setFilter] = useState<Filter>('all');
  // undefined = sheet closed · null = creating · Idea = editing
  const [editing, setEditing] = useState<Idea | null | undefined>(undefined);

  const handleDelete = (i: Idea) => {
    if (confirm(`Delete "${i.title}"?`)) {
      del.mutate(i.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const ideas =
    filter === 'all' ? data : data?.filter((i) => i.status === filter);

  return (
    <div className="curtain-reveal space-y-8">
      <header className="footlight relative -mx-7 px-7 pb-2 pt-1">
        <PageHeader
          title="Idea bank"
          subtitle="A gilt vault of everything we dream of doing together"
        />
      </header>

      <section className="space-y-7">
        <p className="eyebrow">The Vault</p>

        <div className="flex justify-center">
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : !ideas || ideas.length === 0 ? (
          <Empty
            icon="💡"
            title="No ideas yet"
            hint="Tap + to bank an idea for us."
          />
        ) : (
          <div className="curtain-stagger space-y-5">
            {ideas.map((i) => (
              <IdeaCard
                key={i.id}
                idea={i}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <TopBarAdd label="Add idea" onClick={() => setEditing(null)} />

      <Sheet
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Edit idea' : 'New idea'}
      >
        <IdeaForm
          initial={editing ?? undefined}
          onDone={() => setEditing(undefined)}
        />
      </Sheet>
    </div>
  );
}
