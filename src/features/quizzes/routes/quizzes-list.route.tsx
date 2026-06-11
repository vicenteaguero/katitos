import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Badge,
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
    <div className="curtain-reveal">
      <PageHeader
        title="Quizzes"
        subtitle="Make them, play them, compare, laugh"
      />

      <p className="eyebrow mb-8 text-copper before:bg-copper after:bg-copper">
        Tonight's Programme
      </p>

      {isLoading ? (
        <LoadingScreen />
      ) : !data || data.length === 0 ? (
        <Empty icon="🃏" title="No quizzes yet" hint="Tap + to make one." />
      ) : (
        <div className="curtain-stagger space-y-4">
          {data.map((d, i) => (
            <div
              key={d.id}
              style={{ '--i': i } as React.CSSProperties}
              className="velvet-2 gilt-hairline group relative flex items-stretch gap-4 rounded-none shadow-loge"
            >
              <Link
                to={`/quizzes/${d.id}`}
                className="lift-press flex min-w-0 flex-1 items-center gap-4 p-6"
              >
                {/* The playbill seat-number: the deck's emoji on a gilt-framed tile */}
                <span className="gilt-hairline-flat candle-flicker flex h-14 w-14 shrink-0 items-center justify-center rounded-none bg-surface text-3xl shadow-catch">
                  {emojiFor(d.kind)}
                </span>
                <div className="min-w-0 space-y-2">
                  <p className="truncate font-display text-2xl font-medium leading-none tracking-tight text-fg">
                    {d.title}
                  </p>
                  <Badge tone="accent">{d.mode}</Badge>
                </div>
              </Link>
              <div className="flex items-center pr-5">
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
              </div>
            </div>
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
