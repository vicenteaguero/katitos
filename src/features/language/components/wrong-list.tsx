import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Mic } from 'lucide-react';
import { useMembers, useUserId } from '@kernel/auth';
import { Card, CardRows, SectionLabel } from '@kernel/ui';
import { useAllReviews, useAllVocab } from '../api/vocab';
import { headword, meaningOf } from '../lib/pick';
import { useLanguages } from '../lib/languages';
import { VoiceThread } from './kit/voice-thread';

/**
 * What your love keeps forgetting - and a microphone on each one.
 *
 * The teacher's view, and the reason the review rows are readable by both of
 * us: without it she is guessing at what to go over next lesson. Only the
 * OTHER person's misses - your own are just today's practice. The mic is the
 * part nothing else can do: her voice, aimed at the word he keeps missing,
 * on his phone in a minute.
 */
export function WrongList() {
  const userId = useUserId();
  const { data: members } = useMembers();
  const { data: reviews } = useAllReviews();
  const { native: support } = useLanguages();
  // HIS lapses are in the language I TEACH - my own language. Looking them
  // up in the dictionary I am learning found nothing, ever, for either of us.
  const { data: words } = useAllVocab(support);
  const [openId, setOpenId] = useState<string | null>(null);

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
    <section>
      <SectionLabel note="drill these next class">Keeps missing</SectionLabel>
      <Card tone="hairline" className="px-3.5 py-0">
        <CardRows>
          {rows.map(({ review, word }) => (
            <div key={review.vocab_id} className="py-1.5">
              <div className="flex min-h-[44px] items-center gap-2.5">
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
                <span className="shrink-0 font-sans text-[11px] font-bold text-copper">
                  {review.lapses}×
                </span>
                <button
                  type="button"
                  aria-label={`Say ${headword(word!)} for them`}
                  aria-pressed={openId === word!.id}
                  onClick={() =>
                    setOpenId(openId === word!.id ? null : word!.id)
                  }
                  className="lift-press flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <Mic className="h-[15px] w-[15px]" />
                </button>
              </div>
              {openId === word!.id && (
                <div className="pb-2">
                  <VoiceThread word={word!} compact startOpen />
                </div>
              )}
            </div>
          ))}
        </CardRows>
      </Card>
    </section>
  );
}

/**
 * The learner's side of the same list: a way into a session of only the
 * words that keep going wrong.
 */
export function LapsesLink() {
  const userId = useUserId();
  const { data: reviews } = useAllReviews();
  const lapsed = (reviews ?? []).filter(
    (r) => r.user_id === userId && r.lapses > 0
  ).length;
  if (lapsed === 0) return null;
  return (
    <Link
      to="/language/study?scope=lapses"
      className="font-sans text-[11px] font-bold text-gold"
    >
      Just the {Math.min(lapsed, 8)} you keep missing
    </Link>
  );
}
