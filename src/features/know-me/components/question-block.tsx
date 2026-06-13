import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
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
 * One question's full lifecycle — answer → wait → reveal — scoped entirely to
 * its own day_id. The route renders one per question, so the day can carry
 * several without any shared state between them.
 */
export function QuestionBlock({ item }: { item: QuestionWithDay }) {
  const dayId = item.dayId;

  // Live "partner submitted" signal for THIS question only.
  useTableSync('know_me_presence', qk.knowMe.reveal(dayId), {
    filter: `day_id=eq.${dayId}`,
    enabled: true,
  });

  const { data: mine } = useMyAnswer(dayId);
  const { data: partnerSubmitted } = usePartnerSubmitted(dayId);
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
