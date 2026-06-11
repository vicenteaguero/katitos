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
    <Card className="km-candle space-y-7 text-center">
      <p className="eyebrow">Before the Curtain</p>
      <p className="font-display text-3xl font-medium leading-tight tracking-tight text-fg">
        {today.question.prompt}
      </p>
      <div className="gilt-hairline-flat velvet-2 space-y-2 rounded-none p-5 text-left font-sans text-sm text-muted shadow-catch">
        <div>
          You said:{' '}
          <b className="font-semibold text-fg">{labelOf(ownChoice)}</b>
        </div>
        <div>
          Your guess for {partnerName}:{' '}
          <b className="font-semibold text-fg">{labelOf(guessChoice)}</b>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 font-display text-lg italic text-purple">
        <Spinner />
        <span className="candle-flicker">
          Waiting for {partnerName} {emoji}…
        </span>
      </div>
    </Card>
  );
}
