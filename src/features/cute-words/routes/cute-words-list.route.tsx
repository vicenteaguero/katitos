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
import { useCuteWords } from '../api/cute-words.queries';
import { useDeleteCuteWord } from '../api/cute-words.mutations';
import { CuteWordCard } from '../components/cute-word-card';
import { CuteWordForm } from '../components/cute-word-form';
import type { CuteWord } from '../types';

export function CuteWordsListRoute() {
  useTableSync('cute_words', qk.cuteWords.list());
  const { data, isLoading, isError } = useCuteWords();
  const del = useDeleteCuteWord();
  const [open, setOpen] = useState(false);

  const handleDelete = (w: CuteWord) => {
    if (confirm(`Delete "${w.term}"?`)) {
      del.mutate(w.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="curtain-reveal">
      <p className="eyebrow mb-5 text-copper">Our private tongue</p>
      <PageHeader title="Cute words" subtitle="A dictionary of just us" />
      <div className="seam mb-12" aria-hidden="true" />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="📖"
          title="No words yet"
          hint="Tap + to coin the first word of our language."
        />
      ) : (
        <div className="curtain-stagger space-y-5">
          {data.map((w) => (
            <CuteWordCard key={w.id} word={w} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Fab label="Add word" onClick={() => setOpen(true)}>
        <Plus />
      </Fab>

      <Sheet open={open} onClose={() => setOpen(false)} title="New word">
        <CuteWordForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}
