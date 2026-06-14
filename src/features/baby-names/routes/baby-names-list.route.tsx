import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Empty,
  Fab,
  LoadingScreen,
  PageHeader,
  Segmented,
  Sheet,
} from '@kernel/ui';
import type { SegmentOption } from '@kernel/ui';
import { useBabyNames } from '../api/baby-names.queries';
import { BabyNameCard } from '../components/baby-name-card';
import { BabyNameForm } from '../components/baby-name-form';

type Filter = 'all' | 'girl' | 'boy' | 'any';

const filters: SegmentOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'girl', label: 'Girl' },
  { value: 'boy', label: 'Boy' },
  { value: 'any', label: 'Any' },
];

export function BabyNamesListRoute() {
  useTableSync('baby_names', qk.babyNames.list());
  useTableSync('baby_name_votes', qk.babyNames.list());

  const { data, isLoading, isError } = useBabyNames();
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data;
    return data.filter((n) => (n.gender ?? 'any') === filter);
  }, [data, filter]);

  return (
    <div className="curtain-reveal space-y-8">
      <PageHeader
        title="Baby names"
        subtitle="Dreaming up our little ones — like or pass, together 💜"
      />

      {/* The relationship as one gold-stitched line beneath the program head. */}
      <hr className="seam" aria-hidden="true" />

      <section className="space-y-7">
        <p className="eyebrow text-purple before:bg-purple after:bg-purple">
          The Cradle Book
        </p>

        <Segmented options={filters} value={filter} onChange={setFilter} />

        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : visible.length === 0 ? (
          <Empty
            icon="👶"
            title={
              data && data.length > 0 ? 'None in this filter' : 'No names yet'
            }
            hint={
              data && data.length > 0
                ? 'Try another gender filter.'
                : 'Tap + to propose a name.'
            }
          />
        ) : (
          <div className="curtain-stagger space-y-5">
            {visible.map((n, index) => (
              <div key={n.id} style={{ '--i': index } as React.CSSProperties}>
                <BabyNameCard name={n} />
              </div>
            ))}
          </div>
        )}
      </section>

      <Fab label="Propose name" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New baby name"
      >
        <BabyNameForm onDone={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}
