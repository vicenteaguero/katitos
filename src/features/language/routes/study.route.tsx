import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, RotateCcw, Volume2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  Input,
  LoadingScreen,
  OptionButton,
  PlayButton,
} from '@kernel/ui';
import { useAllVocab, useGradeVocab, useMyReviews } from '../api/vocab';
import { buildSession, type Grade } from '../lib/srs';
import { LetterKeys } from '../components/letter-keys';
import { answerMatches } from '../lib/answer-match';
import { useLanguages } from '../lib/languages';
import { headword, meaningOf, noteOf, termOf, termLangOf } from '../lib/pick';
import { LANG_NATIVE_LABELS, type Vocab } from '../types';

/** The four ways a card can be asked. */
type Mode = 'recall' | 'choice' | 'type' | 'listen';

/**
 * Today's practice.
 *
 * Pulls whatever is due across every deck, asks each card in whichever way it
 * can be asked, and remembers the answer. The old screen shuffled one deck and
 * forgot everything the moment you left.
 */
export function StudyRoute() {
  const { native: support, learning } = useLanguages();
  const { data: words, isLoading } = useAllVocab(learning);
  const { data: reviews } = useMyReviews();
  const grade = useGradeVocab();

  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  // Frozen for the session so answering a card doesn't reshuffle the queue
  // under your feet.
  const [sessionKey, setSessionKey] = useState(0);
  /**
   * Built once BOTH halves have arrived.
   *
   * The reviews query waits for the user id while the words query does not, so
   * this reliably ran first with no reviews at all — every word looked due,
   * and the frozen queue was twenty arbitrary cards instead of what the
   * schedule actually asked for.
   */
  const ready = !!words && !!reviews;
  const session = useMemo(
    () => (ready ? buildSession(words, reviews) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, sessionKey]
  );

  if (isLoading || !ready) return <LoadingScreen />;
  if (session.length === 0) {
    return (
      <Empty
        icon="🌙"
        title="Nothing due right now"
        hint="Everything you've learned is resting. Come back tomorrow."
        action={
          <Link to="/language">
            <Button variant="secondary">Back to the decks</Button>
          </Link>
        }
      />
    );
  }

  const card = session[Math.min(i, session.length - 1)];
  const mode = modeFor(card, i);
  const choices = mode === 'choice' ? choicesFor(card, words ?? [], i) : [];

  const answer = (g: Grade) => {
    grade.mutate({
      vocabId: card.id,
      grade: g,
      prev: reviews?.get(card.id) ?? null,
    });
    setScore((s) => ({
      right: s.right + (g === 2 ? 1 : 0),
      total: s.total + 1,
    }));
    setRevealed(false);
    setTyped('');
    setPicked(null);
    if (i + 1 >= session.length) setDone(true);
    else setI((n) => n + 1);
  };

  const restart = () => {
    setI(0);
    setRevealed(false);
    setTyped('');
    setPicked(null);
    setDone(false);
    setScore({ right: 0, total: 0 });
    setSessionKey((k) => k + 1);
  };

  if (done) {
    return (
      <div className="curtain-reveal flex h-full flex-col items-center justify-center gap-6 text-center">
        <p className="text-6xl">{score.right === score.total ? '🌟' : '💪'}</p>
        <div>
          <p className="font-display text-3xl text-fg">
            {score.right} / {score.total}
          </p>
          <p className="mt-1 font-sans text-sm text-muted">
            knew it straight away
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={restart}>
            <RotateCcw size={16} /> Again
          </Button>
          <Link to="/language">
            <Button>Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="curtain-reveal flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Link to="/language" className="font-sans text-sm text-muted">
          ✕ Exit
        </Link>
        <p className="font-sans text-xs tabular-nums text-muted">
          {i + 1} / {session.length}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
        {/* ── the prompt ─────────────────────────────────────────────── */}
        <div className="marble gilt-hairline shadow-loge rounded-lg px-5 py-8 text-center">
          {mode === 'listen' ? (
            <div className="space-y-3">
              <Volume2 className="mx-auto h-6 w-6 text-brown/60" />
              {card.audio_path ? (
                <PlayButton
                  bucket={BUCKETS.languageAudio}
                  path={card.audio_path}
                  className="h-9 w-full"
                />
              ) : null}
              <p className="font-sans text-xs uppercase tracking-[0.18em] text-brown/60">
                what did she say?
              </p>
            </div>
          ) : mode === 'recall' ? (
            <>
              <p className="font-display text-4xl font-semibold leading-tight text-accent">
                {headword(card)}
              </p>
              {card.transliteration && (
                <p className="mt-2 font-display text-base italic text-copper">
                  {card.transliteration}
                </p>
              )}
            </>
          ) : (
            <p className="font-display text-3xl font-semibold text-brown">
              {meaningOf(card, support) || headword(card)}
            </p>
          )}

          {revealed && (
            <div className="km-reveal mt-5 space-y-1 border-t border-brown/15 pt-4">
              <p className="font-display text-2xl text-brown">
                {mode === 'recall' ? meaningOf(card, support) : headword(card)}
              </p>
              {card.transliteration && mode !== 'recall' && (
                <p className="font-display text-sm italic text-copper">
                  {card.transliteration}
                </p>
              )}
              {noteOf(card, support) && (
                <p className="font-sans text-xs italic text-brown/70">
                  {noteOf(card, support)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── the answer ─────────────────────────────────────────────── */}
        {!revealed && mode === 'choice' && (
          <div className="space-y-2">
            {choices.map((c) => (
              <OptionButton
                key={c.id}
                state={picked === c.id ? 'picked' : 'idle'}
                onClick={() => {
                  setPicked(c.id);
                  setRevealed(true);
                }}
                className="px-4 py-3 font-display text-lg"
              >
                {headword(c)}
              </OptionButton>
            ))}
          </div>
        )}

        {!revealed && mode === 'type' && (
          <div className="space-y-2">
            <Input
              value={typed}
              // A real keyboard types here — it was read-only, so on a
              // computer nothing could be typed at all, and on a phone every
              // answer with a space in it was impossible (no space key). The
              // on-screen letters stay for the phone with no Cyrillic layout.
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typed) setRevealed(true);
              }}
              lang={termLangOf(card)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={`type it in ${LANG_NATIVE_LABELS[termLangOf(card)]}…`}
              className="text-center font-display text-xl"
            />
            <LetterKeys
              lang={termLangOf(card)}
              onKey={(ch) => setTyped((t) => t + ch)}
              onBackspace={() => setTyped((t) => t.slice(0, -1))}
            />
            <Button full onClick={() => setRevealed(true)} disabled={!typed}>
              <Check size={16} /> Check
            </Button>
          </div>
        )}

        {!revealed && (mode === 'recall' || mode === 'listen') && (
          <Button full variant="secondary" onClick={() => setRevealed(true)}>
            Show me
          </Button>
        )}

        {revealed && mode === 'type' && (
          <p
            className={cn(
              'text-center font-sans text-sm',
              answerMatches(typed, termOf(card))
                ? 'text-success'
                : 'text-danger'
            )}
          >
            {answerMatches(typed, termOf(card))
              ? 'Exactly right 🌟'
              : `You wrote "${typed}"`}
          </p>
        )}

        {revealed && (
          <div className="flex gap-2">
            <Button full variant="secondary" onClick={() => answer(0)}>
              No idea
            </Button>
            <Button full variant="secondary" onClick={() => answer(1)}>
              Almost
            </Button>
            <Button full onClick={() => answer(2)}>
              Knew it
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Vary how a card is asked so it's practice, not memorising one prompt.
 * A card with no audio is never asked by ear; one with no translation can only
 * be recalled.
 */
function modeFor(card: Vocab, index: number): Mode {
  const wheel: Mode[] = ['recall', 'choice', 'type', 'recall', 'listen'];
  const want = wheel[index % wheel.length];
  if (want === 'listen' && !card.audio_path) return 'recall';
  // A card with nothing but the word itself can only be recalled — asking
  // "which of these means it" with no meaning to show is a blank screen.
  if (want === 'choice' && !meaningOf(card, 'en')) return 'recall';
  if (want === 'type' && termOf(card).length > 24) return 'recall';
  return want;
}

/** Three wrong answers and the right one, stable for a given card. */
function choicesFor(card: Vocab, all: Vocab[], seed: number): Vocab[] {
  const others = all.filter((p) => p.id !== card.id && termOf(p));
  const picked: Vocab[] = [];
  for (let k = 0; k < others.length && picked.length < 3; k++) {
    // Deterministic stride so the options don't reshuffle on every render.
    const idx = (seed * 7 + k * 13) % others.length;
    const cand = others[idx];
    if (cand && !picked.some((p) => p.id === cand.id)) picked.push(cand);
  }
  const pool = [...picked, card];
  // Rotate rather than shuffle — again, stable across renders.
  const offset = seed % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}
