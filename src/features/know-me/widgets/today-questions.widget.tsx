import { Link } from 'react-router';
import { HeartHandshake, Check } from 'lucide-react';
import { Card } from '@kernel/ui';
import { useTodayQuestions } from '../api/know-me.queries';

/**
 * Home surface for Know-Me: tonight's open question(s) as tappable prompts.
 * Renders one card per still-unanswered prompt (up to three), so the dashboard
 * reads "here's what's waiting for you". When everything's answered it collapses
 * to a single quiet "all answered" line; when there's no day yet it shows
 * nothing (Home stays clean).
 */
export function TodayQuestionsWidget() {
  const { data, isLoading } = useTodayQuestions();
  if (isLoading || !data || data.length === 0) return null;

  const open = data.filter((q) => !q.answered).slice(0, 3);

  if (open.length === 0) {
    return (
      <Link to="/know-me" className="block">
        <Card className="lift-press flex items-center gap-3">
          <Check className="h-5 w-5 shrink-0 text-gold" strokeWidth={2} />
          <span className="font-sans text-sm text-muted">
            All answered — see how you both did
          </span>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {open.map((q, i) => (
        <Link key={q.dayId} to="/know-me" className="block">
          <Card className="km-candle lift-press flex flex-col gap-2">
            <span className="flex items-center gap-2 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted">
              <HeartHandshake className="h-3.5 w-3.5 text-gold" />
              {open.length > 1
                ? `Question ${i + 1} of ${open.length}`
                : 'Know Me'}
            </span>
            <p className="font-display text-xl font-medium italic leading-snug text-fg">
              {q.prompt}
            </p>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Answer →
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
