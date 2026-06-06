import { usePartner } from '@kernel/auth';
import { useDeck, type DeckMode } from '@kernel/engines/deck';
import { Button, Card, Empty, LoadingScreen } from '@kernel/ui';
import { DeckCardView } from './deck-card-view';

export function DeckPlayer({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const { partner } = usePartner();

  if (deck.isLoading) return <LoadingScreen />;
  if (!deck.deck) return <Empty icon="❓" title="Deck not found" />;
  if (deck.total === 0)
    return <Empty icon="🃏" title="No cards yet" hint="Add some to play." />;

  const atEnd = deck.index >= deck.total - 1;
  const scoreLabel =
    deck.deck.mode === 'quiz'
      ? `${deck.score}/${deck.total} correct`
      : `${deck.score}/${deck.total} matches`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="truncate font-medium text-fg">{deck.deck.title}</span>
        <span className="tabular-nums">
          {deck.index + 1}/{deck.total}
        </span>
      </div>

      {deck.current && (
        <DeckCardView
          card={deck.current}
          mode={deck.deck.mode as DeckMode}
          myAnswer={deck.myAnswer}
          partnerAnswer={deck.partnerAnswer}
          isAnswered={deck.isAnswered}
          isRevealed={deck.isRevealed}
          onAnswer={deck.answer}
          partnerName={partner?.display_name}
        />
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={deck.prev} disabled={deck.index === 0}>
          Back
        </Button>
        <Button onClick={deck.next} disabled={atEnd}>
          Next
        </Button>
      </div>

      {deck.allAnswered && deck.deck.mode !== 'swipe' && (
        <Card className="text-center">
          <p className="text-sm text-muted">All answered</p>
          <p className="text-2xl font-bold text-accent">{scoreLabel}</p>
        </Card>
      )}
    </div>
  );
}
