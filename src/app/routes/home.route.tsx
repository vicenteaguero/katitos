import { usePartner } from '@kernel/auth';
import { relativeTime } from '@kernel/lib';
import { usePartnerPresence } from '@features/presence';
import { GeorgiaCountdownWidget } from '@features/georgia';
import { TodayQuestionsWidget } from '@features/know-me';
import { LastPolaroidWidget } from '@features/polaroid';

/**
 * Home, distilled. No widget wall — just the four things that matter when you
 * open the app: who your love is and whether they're here, how long until
 * Georgia, tonight's question(s), and the last photo you two took.
 */

/** The greeting: your love's name, big, with a live here/last-seen line. */
function Greeting() {
  const { partner } = usePartner();
  const { online } = usePartnerPresence();
  const name = partner?.display_name ?? 'love';

  return (
    <header className="space-y-3 pt-2 text-center">
      <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-fg">
        {name}! <span className="candle-flicker">{partner?.emoji ?? '❤️'}</span>
      </h1>
      <div className="flex items-center justify-center gap-2">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${
            online ? 'candle-flicker bg-purple' : 'bg-muted'
          }`}
          aria-hidden="true"
        />
        <span className="font-sans text-sm text-muted">
          {online
            ? 'here with you now'
            : partner?.last_seen_at
              ? `last here ${relativeTime(partner.last_seen_at)}`
              : 'offline'}
        </span>
      </div>
    </header>
  );
}

export function HomeRoute() {
  return (
    <div className="curtain-reveal space-y-8">
      <Greeting />
      <GeorgiaCountdownWidget />
      <TodayQuestionsWidget />
      <LastPolaroidWidget />
    </div>
  );
}
