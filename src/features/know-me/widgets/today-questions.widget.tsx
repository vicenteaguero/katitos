import { Link } from 'react-router';
import { useTodayQuestions } from '../api/know-me.queries';

/**
 * Home surface for Know-Me: tonight's questions as tappable prompts. The first
 * still-unanswered prompt is lit (green dot + "Answer →"); the rest sit quieter
 * beneath it. Renders nothing until there's a day (Home stays clean), and
 * collapses to a single "all answered" line once you're done.
 */
export function TodayQuestionsWidget() {
  const { data, isLoading } = useTodayQuestions();
  if (isLoading || !data || data.length === 0) return null;

  const items = data.slice(0, 3);
  const allAnswered = items.every((q) => q.answered);
  // The first unanswered question is the "live" one.
  const liveIndex = items.findIndex((q) => !q.answered);

  if (allAnswered) {
    return (
      <Link
        to="/know-me"
        className="lift-press block rounded px-5 py-4"
        style={{
          border: '1px solid rgba(201,162,75,.2)',
          background: 'linear-gradient(160deg, #20101b, #170a12)',
        }}
      >
        <span className="font-sans text-sm text-muted">
          ✓ All answered — see how you both did
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((q, i) => {
        const live = i === liveIndex;
        return (
          <Link
            key={q.dayId}
            to="/know-me"
            className="lift-press block rounded px-5 py-[18px] text-left"
            style={{
              border: live
                ? '1px solid rgba(201,162,75,.26)'
                : '1px solid rgba(201,162,75,.18)',
              background: live
                ? 'linear-gradient(160deg, #251020, #1a0b15)'
                : 'linear-gradient(160deg, #20101b, #170a12)',
            }}
          >
            <span className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#9d8f86]">
              {live && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple"
                  aria-hidden="true"
                />
              )}
              Question {i + 1} of {items.length}
            </span>
            <p className="m-0 mt-2 font-display text-[1.31rem] font-medium italic leading-[1.25] text-fg">
              {q.prompt}
            </p>
            {live && (
              <span className="mt-2 inline-block font-sans text-[11.5px] font-bold uppercase tracking-[0.13em] text-gold">
                Answer →
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
