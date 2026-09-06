import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DateTime } from 'luxon';
import { ArrowLeft, Check, RotateCcw, Volume2 } from 'lucide-react';
import { useHotkeys } from '@kernel/hooks';
import { BUCKETS } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Button,
  Desk,
  Empty,
  Input,
  Kbd,
  ListSkeleton,
  OptionButton,
  PlayButton,
  useDesk,
  useIsDesk,
} from '@kernel/ui';
import { useLesson } from '../api/lessons.queries';
import { useAllVocab, useGradeVocab, useMyReviews } from '../api/vocab';
import { buildSession, type Grade } from '../lib/srs';
import {
  choicesFor,
  clearSession,
  expectedForms,
  hash,
  loadSession,
  missMessage,
  modeFor,
  nearMiss,
  saveSession,
  suggestGrade,
} from '../lib/study';
import { LetterKeys } from '../components/letter-keys';
import { VoiceThread } from '../components/kit/voice-thread';
import { useLanguages } from '../lib/languages';
import { headword, meaningOf, noteOf, termLangOf } from '../lib/pick';
import { LANG_NATIVE_LABELS, type Vocab } from '../types';

/** Which words a session is made of. */
type Scope = 'due' | 'lesson' | 'lapses';

const TITLES: Record<Scope, string> = {
  due: "Today's practice",
  lesson: "This lesson's words",
  lapses: 'The ones you keep missing',
};

/**
 * Practice.
 *
 * Today's due cards across every course - or one lesson's words, or the
 * handful he keeps missing. Each card is asked in the way its mastery calls
 * for; a blank comes round again before the session ends; a half-finished
 * session survives a phone call; and on a desk the whole thing runs from
 * the keyboard.
 */
export function StudyRoute() {
  const { native: support, learning } = useLanguages();
  const [params] = useSearchParams();
  const lessonId = params.get('lesson');
  const scope: Scope = lessonId
    ? 'lesson'
    : params.get('scope') === 'lapses'
      ? 'lapses'
      : 'due';
  const scopeKey = lessonId ? `lesson:${lessonId}` : scope;

  const { data: words, isLoading } = useAllVocab(learning);
  const { data: lesson } = useLesson(lessonId ?? undefined);
  const { data: reviews } = useMyReviews();
  const grade = useGradeVocab();
  const desk = useIsDesk();
  useDesk();

  // The queue is ids, so a card can come round twice.
  const [queue, setQueue] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [missed, setMissed] = useState<string[]>([]);
  /** Looking back at a card already answered - read only. */
  const [peek, setPeek] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const byId = useMemo(
    () => new Map((words ?? []).map((w) => [w.id, w])),
    [words]
  );
  const ready = !!words && !!reviews && (!lessonId || !!lesson);

  /** The cards this scope asks for, in order. */
  const build = (): string[] => {
    if (!words || !reviews) return [];
    if (scope === 'lesson') {
      const seen = new Set<string>();
      const all = Object.values(lesson?.vocabByBlock ?? {}).flat();
      return all
        .filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)))
        .sort((a, b) => hash(a.id) - hash(b.id))
        .map((w) => w.id);
    }
    if (scope === 'lapses') {
      return words
        .filter((w) => (reviews.get(w.id)?.lapses ?? 0) > 0)
        .sort(
          (a, b) =>
            (reviews.get(b.id)?.lapses ?? 0) - (reviews.get(a.id)?.lapses ?? 0)
        )
        .slice(0, 8)
        .map((w) => w.id);
    }
    return buildSession(words, reviews).map((w) => w.id);
  };

  // Built - or brought back - once both halves have arrived. The reviews
  // query waits for the user id while the words query does not, so building
  // on the first render gave a session of twenty arbitrary cards.
  useEffect(() => {
    if (!ready || queue) return;
    const saved = loadSession(scopeKey);
    if (saved && saved.ids.length && saved.ids.every((id) => byId.has(id))) {
      setQueue(saved.ids);
      setI(Math.min(saved.i, saved.ids.length - 1));
      setScore(saved.score);
      setMissed(saved.missed);
      return;
    }
    setQueue(build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queue, scopeKey]);

  useEffect(() => {
    if (!queue || done) return;
    saveSession(scopeKey, {
      day: DateTime.now().toISODate()!,
      ids: queue,
      i,
      score,
      missed,
    });
  }, [queue, i, score, missed, done, scopeKey]);

  const card = queue ? byId.get(queue[Math.min(i, queue.length - 1)]) : null;
  const review = card ? (reviews?.get(card.id) ?? null) : null;
  const mode = card ? modeFor(card, review, i) : 'recall';
  const choices =
    card && mode === 'choice' ? choicesFor(card, words ?? [], i) : [];
  const forms = card ? expectedForms(card) : [];
  const miss = card && mode === 'type' ? nearMiss(typed, forms) : null;

  const reveal = () => {
    if (!card || revealed || peek !== null) return;
    setRevealed(true);
  };

  const answer = (g: Grade) => {
    if (!card || !queue || peek !== null) return;
    grade.mutate({ vocabId: card.id, grade: g, prev: review });
    setScore((s) => ({
      right: s.right + (g === 2 ? 1 : 0),
      total: s.total + 1,
    }));
    if (g < 2) setMissed((m) => (m.includes(card.id) ? m : [...m, card.id]));
    // A blank comes round again before the session ends - once. The queue
    // itself is the record, so a resumed session does not add it again.
    let next = queue;
    if (g === 0 && !queue.slice(i + 1).includes(card.id)) {
      next = [...queue, card.id];
      setQueue(next);
    }
    setRevealed(false);
    setTyped('');
    setPicked(null);
    if (i + 1 >= next.length) {
      setDone(true);
      clearSession(scopeKey);
    } else setI((n) => n + 1);
  };

  const start = (ids: string[]) => {
    clearSession(scopeKey);
    setQueue(ids);
    setI(0);
    setRevealed(false);
    setTyped('');
    setPicked(null);
    setScore({ right: 0, total: 0 });
    setMissed([]);
    setPeek(null);
    setDone(false);
  };

  useHotkeys(
    {
      // Space and Enter belong to the typed answer's own box in type mode.
      ...(mode === 'type' ? {} : { space: reveal, enter: reveal }),
      '1': () => revealed && answer(0),
      '2': () => revealed && answer(1),
      '3': () => revealed && answer(2),
      arrowleft: () => peek === null && i > 0 && setPeek(i - 1),
      escape: () => setPeek(null),
    },
    { enabled: !!card && !done }
  );

  if (isLoading || !ready || !queue)
    return <ListSkeleton rows={2} header={false} />;

  if (queue.length === 0 || !card) {
    return (
      <Empty
        icon="🌙"
        title={
          scope === 'due' ? 'Nothing due right now' : 'Nothing to practise here'
        }
        hint={
          scope === 'due'
            ? "Everything you've learned is resting. Come back tomorrow."
            : undefined
        }
        action={
          <Link to="/language">
            <Button variant="secondary">Back to the courses</Button>
          </Link>
        }
      />
    );
  }

  if (done) {
    return (
      <div className="curtain-reveal flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-6xl">{score.right === score.total ? '🌟' : '💪'}</p>
        <div>
          <p className="font-display text-3xl text-fg">
            {score.right} / {score.total}
          </p>
          <p className="mt-1 font-sans text-sm text-muted">
            knew it straight away
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {missed.length > 0 && (
            <Button onClick={() => start(missed)}>
              <RotateCcw size={16} /> The {missed.length} you missed
            </Button>
          )}
          <Button variant="secondary" onClick={() => start(build())}>
            Again
          </Button>
          <Link to="/language">
            <Button variant="secondary">Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Looking back: the card as it was, everything shown, nothing to grade.
  if (peek !== null) {
    const back = byId.get(queue[peek]);
    if (back) {
      return (
        <Desk narrow>
          <div className="curtain-reveal flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPeek(null)}
                className="font-sans text-sm text-muted hover:text-fg"
              >
                ← Back to the card
              </button>
              <p className="font-sans text-xs tabular-nums text-muted">
                {peek + 1} / {queue.length} - already answered
              </p>
            </div>
            <Card card={back} support={support} revealed mode="recall" />
          </div>
        </Desk>
      );
    }
  }

  const suggested = miss ? suggestGrade(miss) : null;
  const gradeVariant = (g: Grade) =>
    revealed && suggested === g ? 'primary' : 'secondary';

  return (
    <Desk narrow>
      <div className="curtain-reveal flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link to="/language" className="font-sans text-sm text-muted">
            ✕ {TITLES[scope]}
          </Link>
          <p className="font-sans text-xs tabular-nums text-muted">
            {i > 0 && (
              <button
                type="button"
                aria-label="The previous card"
                onClick={() => setPeek(i - 1)}
                className="mr-2 text-muted hover:text-fg"
              >
                <ArrowLeft className="inline h-3.5 w-3.5" />
              </button>
            )}
            {i + 1} / {queue.length}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
          <Card
            card={card}
            support={support}
            revealed={revealed}
            mode={mode}
            autoPlay
          />

          {/* ── the answer ─────────────────────────────────────────────── */}
          {mode === 'choice' && (
            <div className="space-y-2">
              {choices.map((c) => {
                const right = revealed && c.id === card.id;
                const wrong = revealed && picked === c.id && c.id !== card.id;
                return (
                  <OptionButton
                    key={c.id}
                    state={
                      right
                        ? 'right'
                        : wrong
                          ? 'wrong'
                          : picked === c.id
                            ? 'picked'
                            : 'idle'
                    }
                    disabled={revealed}
                    onClick={() => {
                      setPicked(c.id);
                      setRevealed(true);
                    }}
                    className="px-4 py-3 font-display text-lg"
                  >
                    {headword(c)}
                  </OptionButton>
                );
              })}
            </div>
          )}

          {!revealed && mode === 'type' && (
            <div className="space-y-2">
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typed) setRevealed(true);
                }}
                lang={termLangOf(card)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus={desk}
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
            <Button full variant="secondary" onClick={reveal}>
              Show me
            </Button>
          )}

          {revealed && mode === 'type' && miss && (
            <p
              className={cn(
                'text-center font-sans text-sm',
                miss === 'exact'
                  ? 'text-success'
                  : miss === 'wrong'
                    ? 'text-danger'
                    : 'text-warning'
              )}
            >
              {missMessage(miss, typed, forms[0] ?? '')}
            </p>
          )}

          {/* Her voice on this word if she has left it, and his own try -
              the reveal is where a wrong word gets said aloud. */}
          {revealed && <VoiceThread word={card} compact />}

          {revealed && (
            <div className="flex gap-2">
              <Button full variant={gradeVariant(0)} onClick={() => answer(0)}>
                No idea
              </Button>
              <Button full variant={gradeVariant(1)} onClick={() => answer(1)}>
                Almost
              </Button>
              <Button full variant={gradeVariant(2)} onClick={() => answer(2)}>
                Knew it
              </Button>
            </div>
          )}

          {desk && (
            <p className="text-center font-sans text-xs leading-6 text-muted">
              <Kbd>space</Kbd> show - <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd>{' '}
              grade - <Kbd>←</Kbd> the last card
            </p>
          )}
        </div>
      </div>
    </Desk>
  );
}

/** The card itself: the prompt, and the answer once it is turned over. */
function Card({
  card,
  support,
  revealed,
  mode,
  autoPlay = false,
}: {
  card: Vocab;
  support: ReturnType<typeof useLanguages>['native'];
  revealed: boolean;
  mode: 'recall' | 'choice' | 'type' | 'listen';
  /** Her voice plays by itself when the answer is shown. */
  autoPlay?: boolean;
}) {
  return (
    <div className="marble gilt-hairline shadow-loge rounded-lg px-4 py-6 text-center">
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
        <div className="km-reveal mt-3 space-y-1 border-t border-brown/15 pt-3">
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
          {/* Every reveal is a chance to hear it in her voice - not only the
              listening cards. Plays by itself; the button is there for again. */}
          {card.audio_path && mode !== 'listen' && (
            <div className="flex justify-center pt-1">
              <PlayButton
                bucket={BUCKETS.languageAudio}
                path={card.audio_path}
                size="sm"
                label="Hear her"
                autoPlayKey={autoPlay ? card.id : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
