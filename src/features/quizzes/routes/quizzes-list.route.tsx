import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Badge,
  Card,
  Empty,
  Fab,
  IconButton,
  LoadingScreen,
  PageHeader,
  Sheet,
  toast,
} from '@kernel/ui';
import { useDecks } from '../api/decks.queries';
import { useDeleteDeck } from '../api/decks.mutations';
import { DeckBuilder } from '../components/deck-builder';
import { DECK_KINDS } from '../types';

const emojiFor = (kind: string) =>
  DECK_KINDS.find((k) => k.kind === kind)?.emoji ?? '🃏';

export function QuizzesListRoute() {
  useTableSync('decks', qk.deck.all());
  const { data, isLoading } = useDecks();
  const del = useDeleteDeck();
  const [building, setBuilding] = useState(false);

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle="Make them, play them, compare, laugh"
      />

      {isLoading ? (
        <LoadingScreen />
      ) : !data || data.length === 0 ? (
        <Empty icon="🃏" title="No quizzes yet" hint="Tap + to make one." />
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <Card
              key={d.id}
              className="flex items-center justify-between gap-3"
            >
              <Link
                to={`/quizzes/${d.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="text-2xl">{emojiFor(d.kind)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.title}</p>
                  <Badge tone="accent">{d.mode}</Badge>
                </div>
              </Link>
              <IconButton
                label="Delete"
                onClick={() => {
                  if (confirm(`Delete "${d.title}"?`))
                    del.mutate(d.id, {
                      onSuccess: () => toast.success('Deleted'),
                      onError: (e) => toast.error(e.message),
                    });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </Card>
          ))}
        </div>
      )}

      <Fab label="New quiz" onClick={() => setBuilding(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={building}
        onClose={() => setBuilding(false)}
        title="New quiz"
      >
        <DeckBuilder onDone={() => setBuilding(false)} />
      </Sheet>
    </div>
  );
}
