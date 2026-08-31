import { useMemo, useState } from 'react';
import { Mic } from 'lucide-react';
import { useMembers, useUserId } from '@kernel/auth';
import { Kicker, ROW_TOOL } from '@kernel/ui';
import { useAllReviews, useAllVocab } from '../api/vocab';
import { headword, meaningOf } from '../lib/pick';
import { useLanguages } from '../lib/languages';
import { VoiceThread } from './kit/voice-thread';

/**
 * What your love keeps forgetting — and a microphone on each one.
 *
 * The teacher's view, and the reason the review rows are readable by both of
 * us: without it she is guessing at what to go over next lesson. Only the
 * OTHER person's misses — your own are just today's practice. The mic is the
 * part nothing else can do: her voice, aimed at the word he keeps missing,
 * on his phone in a minute.
 */
export function WrongList() {
  const userId = useUserId();
  const { data: members } = useMembers();
  const { data: reviews } = useAllReviews();
  const { native: support } = useLanguages();
  // HIS lapses are in the language I TEACH — my own language. Looking them
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
    <section className="space-y-2 rounded-lg bg-surface px-4 py-3">
      <p className="font-sans text-sm font-semibold text-fg">
        What {partner?.display_name ?? 'your love'} keeps forgetting
      </p>
      <p className="font-sans text-xs text-muted">
        Worth going over together — or say it for them now.
      </p>
      <ul className="space-y-1.5">
        {rows.map(({ review, word }) => (
          <li key={review.vocab_id} className="space-y-1.5">
            <div className="flex items-center gap-2">
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
              <Kicker tone="copper" className="shrink-0">
                {review.lapses}×
              </Kicker>
              <button
                type="button"
                aria-label={`Say ${headword(word!)} for them`}
                aria-pressed={openId === word!.id}
                onClick={() => setOpenId(openId === word!.id ? null : word!.id)}
                className={ROW_TOOL}
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
            </div>
            {openId === word!.id && (
              <VoiceThread word={word!} compact startOpen />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
