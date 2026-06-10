import { usePartner } from '@kernel/auth';
import { Card, Spinner } from '@kernel/ui';
import type { QuestionWithDay } from '../types';

/**
 * Shown after I submit but the partner hasn't. Echoes my own picks (never the
 * partner's — they haven't answered) and waits. Flips to the reveal once
 * presence shows both submitted (the route re-renders on the live signal).
 */
export function WaitingCard({
  today,
  ownChoice,
  guessChoice,
}: {
  today: QuestionWithDay;
  ownChoice: string | null;
  guessChoice: string | null;
}) {
  const { partner } = usePartner();
  const partnerName = partner?.display_name ?? 'your love';
  const emoji = partner?.emoji ?? '💛';
  const labelOf = (id: string | null) =>
    today.options.find((o) => o.id === id)?.label ?? '—';

  return (
    <Card className="space-y-4 text-center">
      <p className="text-lg font-medium">{today.question.prompt}</p>
      <div className="space-y-1 rounded-lg border border-border bg-surface-2 p-3 text-left text-sm">
        <div>
          You said: <b>{labelOf(ownChoice)}</b>
        </div>
        <div>
          Your guess for {partnerName}: <b>{labelOf(guessChoice)}</b>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-muted">
        <Spinner />
        <span>
          Waiting for {partnerName} {emoji}…
        </span>
      </div>
    </Card>
  );
}
