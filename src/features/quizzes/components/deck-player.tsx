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
  const progress = deck.total > 0 ? (deck.index + 1) / deck.total : 0;

  return (
    <div className="space-y-7">
      {/* Playbill header: title + the act count, parted by a drawn gilt rule */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="truncate font-display text-2xl font-medium tracking-tight text-fg">
            {deck.deck.title}
          </span>
          <span className="shrink-0 font-sans text-sm tabular-nums text-copper">
            {deck.index + 1}
            <span className="text-muted"> / {deck.total}</span>
          </span>
        </div>
        {/* a gilt progress hairline - the stage advancing, scene by scene */}
        <div className="relative h-px w-full overflow-hidden bg-border/25">
          <div
            className="absolute inset-y-0 left-0 bg-copper transition-transform duration-500 ease-out"
            style={{
              width: '100%',
              transform: `scaleX(${progress})`,
              transformOrigin: 'left',
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* The lit stage: a single gilt-framed card over a warm footlight glow.
          Re-keyed per index so each card flips in on the curtain. */}
      <div className="footlight">
        {deck.current && (
          <Card
            key={deck.index}
            className="curtain-reveal relative isolate p-7"
          >
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
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={deck.prev} disabled={deck.index === 0}>
          Back
        </Button>
        <Button onClick={deck.next} disabled={atEnd}>
          Next
        </Button>
      </div>

      {deck.allAnswered && deck.deck.mode !== 'swipe' && (
        <Card className="curtain-reveal space-y-3 text-center">
          <p className="eyebrow text-copper before:bg-copper after:bg-copper">
            Curtain Call
          </p>
          <p className="gilt-text gold-shimmer font-display text-5xl font-semibold tracking-tight">
            {scoreLabel}
          </p>
        </Card>
      )}
    </div>
  );
}
