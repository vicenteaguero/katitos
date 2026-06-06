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
    <div>
      <PageHeader title="Baby names" subtitle="Like or pass — together" />

      <div className="mb-4">
        <Segmented options={filters} value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
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
        <div className="space-y-3">
          {visible.map((n) => (
            <BabyNameCard key={n.id} name={n} />
          ))}
        </div>
      )}

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
