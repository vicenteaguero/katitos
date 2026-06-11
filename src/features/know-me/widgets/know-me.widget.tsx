import { Link } from 'react-router';
import { usePartner } from '@kernel/auth';
import { Card, CardTitle } from '@kernel/ui';
import {
  useLoveMap,
  useMyAnswer,
  usePartnerSubmitted,
  useReveal,
  useToday,
} from '../api/know-me.queries';

/**
 * READ-ONLY dashboard widget. Never fires ensure-today — it only reflects a day
 * row that already exists (created when the couple opens /know-me).
 */
export function KnowMeWidget() {
  const { partner } = usePartner();
  const { data: today } = useToday();
  const dayId = today?.dayId;
  const { data: mine } = useMyAnswer(dayId);
  const { data: partnerSubmitted } = usePartnerSubmitted(dayId);
  const bothSubmitted = !!mine && !!partnerSubmitted;
  const { data: revealRows } = useReveal(dayId, bothSubmitted);
  const map = useLoveMap();

  const partnerName = partner?.display_name ?? 'them';

  let status: string;
  if (!today) status = 'No question yet';
  else if (!mine) status = 'Answer now';
  else if (!bothSubmitted) status = `Waiting for ${partnerName}`;
  else {
    const me = revealRows?.find((r) => r.is_self);
    const them = revealRows?.find((r) => !r.is_self);
    const gotIt = !!me?.guess_choice && me.guess_choice === them?.own_choice;
    status = gotIt ? '🎯 You got it!' : '😄 Missed';
  }

  return (
    <Link to="/know-me">
      <Card className="km-candle flex h-full flex-col gap-2">
        <CardTitle>Know Me 💛</CardTitle>
        <p className="font-display text-2xl font-medium italic leading-snug text-purple">
          {status}
        </p>
        {map && map.currentStreak > 0 && (
          <p className="mt-auto font-sans text-xs uppercase tracking-[0.1em] text-muted">
            <span className="candle-flicker tabular-nums text-fg">
              {map.currentStreak} 🔥
            </span>{' '}
            streak
          </p>
        )}
      </Card>
    </Link>
  );
}
