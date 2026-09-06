import type { QuestionWithDay } from '../types';
import {
  useMyAnswer,
  usePartnerSubmitted,
  useReveal,
} from '../api/know-me.queries';
import { DailyCard } from './daily-card';
import { WaitingCard } from './waiting-card';
import { RevealCard } from './reveal-card';

/**
 * One question's full lifecycle - answer → wait → reveal - scoped entirely to
 * its own day_id. The route renders one per question, so the day can carry
 * several without any shared state between them.
 */
export function QuestionBlock({ item }: { item: QuestionWithDay }) {
  const dayId = item.dayId;

  // Presence is subscribed once at the route level (a single channel for the
  // whole day instead of one per question); this block just reads its slice.
  const { data: mine } = useMyAnswer(dayId);
  const { data: partnerSubmitted } = usePartnerSubmitted(dayId, !!mine);
  const bothSubmitted = !!mine && !!partnerSubmitted;
  const { data: revealRows } = useReveal(dayId, bothSubmitted);

  if (bothSubmitted && revealRows) {
    return <RevealCard today={item} rows={revealRows} />;
  }
  if (mine) {
    return (
      <WaitingCard
        today={item}
        ownChoice={mine.own_choice ?? null}
        guessChoice={mine.guess_choice ?? null}
      />
    );
  }
  return <DailyCard today={item} />;
}
