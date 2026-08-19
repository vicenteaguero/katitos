import { useMemo } from 'react';
import { useMembers, useUserId } from '@kernel/auth';
import { useAllReviews, useAllVocab } from '../api/vocab';
import { headword, meaningOf } from '../lib/pick';
import { useLangPrefs } from '../lib/lang-prefs';

/**
 * What your love keeps forgetting.
 *
 * The teacher's view, and the reason the review rows are readable by both of
 * us: without it she is guessing at what to go over next lesson. Only shows the
 * OTHER person's misses — your own are just today's practice.
 */
export function WrongList() {
  const userId = useUserId();
  const { data: members } = useMembers();
  const { data: reviews } = useAllReviews();
  const { data: words } = useAllVocab('ru');
  const support = useLangPrefs((s) => s.supportLang);

  const partner = members?.find((m) => m.user_id !== userId);

  const rows = useMemo(() => {
    if (!partner || !reviews || !words) return [];
    const byId = new Map(words.map((w) => [w.id, w]));
    return reviews
      .filter((r) => r.user_id === partner.user_id && r.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 8)
      .map((r) => ({ review: r, word: byId.get(r.vocab_id) }))
      .filter((r) => r.word);
  }, [partner, reviews, words]);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2 rounded-lg bg-surface px-4 py-3">
      <p className="font-sans text-sm font-semibold text-fg">
        What {partner?.display_name ?? 'your love'} keeps forgetting
      </p>
      <p className="font-sans text-xs text-muted">Worth going over together.</p>
      <ul className="space-y-1.5 pt-1">
        {rows.map(({ review, word }) => (
          <li key={review.vocab_id} className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1">
              <span className="font-display text-base text-fg">
                {headword(word!)}
              </span>
              {meaningOf(word!, support) && (
                <span className="ml-2 font-sans text-xs text-muted">
                  {meaningOf(word!, support)}
                </span>
              )}
            </span>
            <span className="shrink-0 font-sans text-[0.6rem] uppercase tracking-[0.12em] text-copper">
              {review.lapses}×
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
