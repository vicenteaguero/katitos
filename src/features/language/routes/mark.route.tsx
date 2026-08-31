import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DateTime } from 'luxon';
import { Check, MessageSquare, RotateCcw, X } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useHotkeys } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Checkbox,
  Desk,
  Empty,
  Field,
  Input,
  Kbd,
  Kicker,
  ListSkeleton,
  ROW_TOOL,
  Textarea,
  toast,
  useDesk,
  useIsDesk,
} from '@kernel/ui';
import { usePartnerProgress } from '../api/courses.queries';
import { useAttemptsForMarking, useLesson } from '../api/lessons.queries';
import { useMarkAttempt, useSaveProgress } from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import { LessonTree } from '../components/lesson-tree';
import { acceptedForms } from '../lib/exercise-schema';
import { verdictOf, weightedScore } from '../lib/marking';
import { clockIn, isAsleep } from '../lib/quiet';
import { pick } from '../lib/pick';
import type { Attempt, Exercise } from '../types';

/** What he actually typed or picked, in a form worth reading. */
function shown(answer: unknown): string {
  if (answer === null || answer === undefined) return '—';
  if (typeof answer === 'boolean') return answer ? 'said it' : 'not yet';
  if (Array.isArray(answer)) return answer.join(' · ');
  if (typeof answer === 'object') {
    return Object.entries(answer as Record<string, string>)
      .map(([l, r]) => `${l} → ${r}`)
      .join(' · ');
  }
  return String(answer);
}

/** "Tue 14:02" — when a thing happened. */
function at(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = DateTime.fromISO(iso);
  return t.isValid ? t.toFormat('ccc HH:mm') : null;
}

/** Her tick and her note, kept on screen until the refetch brings them back. */
type Margin = { teacher_score?: number | null; teacher_note?: string | null };

/**
 * Marking his work.
 *
 * The app can say whether an answer matched; it cannot say whether he has
 * understood, and it certainly cannot write him a note. So everything here
 * is her reading HIS answers: a tick or a cross of her own on each, a word
 * in the margin, a mark that writes itself from the ticks until she says
 * otherwise — and, on a desk, all of it from the home row.
 */
export function MarkRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: attempts } = useAttemptsForMarking(lessonId);
  const { data: hisRows } = usePartnerProgress();
  const { partner } = usePartner();
  const saveProgress = useSaveProgress();
  const markAttempt = useMarkAttempt();
  const { native: support } = useLanguages();
  const navigate = useNavigate();
  const desk = useIsDesk();
  useDesk();
  // His answers arrive while she is looking — homework handed in mid-call.
  useTableSync('lang_attempts', qk.lang.attempts(lessonId ?? 'none'), {
    enabled: !!lessonId,
  });
  useTableSync('lang_lesson_progress', qk.lang.progress());

  const [scoreText, setScoreText] = useState('');
  const [scoreTouched, setScoreTouched] = useState(false);
  const [note, setNote] = useState('');
  const [wake, setWake] = useState(false);
  const [margin, setMargin] = useState<Record<string, Margin>>({});
  const [focus, setFocus] = useState(0);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const noteSaved = useRef(false);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  /** His newest answer per question, with her margin on it. */
  const his = useMemo(() => {
    const out = new Map<string, Attempt>();
    for (const a of attempts ?? []) {
      if (a.user_id === partner?.user_id && !out.has(a.exercise_id)) {
        out.set(a.exercise_id, { ...a, ...margin[a.id] });
      }
    }
    return out;
  }, [attempts, partner?.user_id, margin]);

  const hisProgress = (hisRows ?? []).find((p) => p.lesson_id === lessonId);
  // Her note from last time, if she is back for a second look.
  useEffect(() => {
    setNote(hisProgress?.teacher_note ?? '');
  }, [hisProgress?.teacher_note]);

  const answered = useMemo(
    () => (lesson?.exercises ?? []).filter((ex) => his.has(ex.id)),
    [lesson, his]
  );
  const verdicts = answered.map((ex) => verdictOf(his.get(ex.id)));
  // The mark writes itself from the ticks; she only has to touch it when
  // that is unfair.
  const auto = weightedScore(
    answered.map((ex, i) => ({ points: ex.points, score: verdicts[i]?.score }))
  );
  const score = scoreTouched
    ? scoreText
    : auto == null
      ? ''
      : String(Math.round(auto * 100));

  // Open on the first thing that needs her.
  const firstWrong = verdicts.findIndex((v) => v && !v.correct);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !answered.length) return;
    opened.current = true;
    setFocus(firstWrong >= 0 ? firstWrong : 0);
  }, [answered.length, firstWrong]);
  useEffect(() => {
    rows.current[focus]?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const setVerdict = (ex: Exercise, teacherScore: number | null) => {
    const a = his.get(ex.id);
    if (!a || !lessonId) return;
    setMargin((m) => ({
      ...m,
      [a.id]: { ...m[a.id], teacher_score: teacherScore },
    }));
    markAttempt.mutate({ id: a.id, lessonId, teacherScore });
  };
  const openNote = (ex: Exercise) => {
    const a = his.get(ex.id);
    if (!a) return;
    noteSaved.current = false;
    setNoteFor(a.id);
    setNoteText(a.teacher_note ?? '');
  };
  const saveNote = () => {
    // Enter saves and unmounts the box, and the blur that follows must not
    // save it twice.
    if (!noteFor || !lessonId || noteSaved.current) return;
    noteSaved.current = true;
    const text = noteText.trim() || null;
    setMargin((m) => ({
      ...m,
      [noteFor]: { ...m[noteFor], teacher_note: text },
    }));
    markAttempt.mutate({ id: noteFor, lessonId, teacherNote: text });
    setNoteFor(null);
  };

  const asleep = isAsleep(partner?.timezone);
  const clock = clockIn(partner?.timezone);

  /** Still waiting after this one, oldest first — marking is a queue. */
  const queue = (hisRows ?? [])
    .filter((r) => r.status === 'submitted' && r.lesson_id !== lessonId)
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''));

  const giveBack = (status: 'graded' | 'returned') => {
    if (!lesson || !partner) return;
    if (noteFor) saveNote();
    saveProgress.mutate(
      {
        lessonId: lesson.id,
        forUserId: partner.user_id,
        status,
        score:
          status === 'graded'
            ? score
              ? Number(score) / 100
              : null
            : undefined,
        teacherNote: note.trim() || null,
        title: lesson.title,
        wake,
      },
      {
        onSuccess: () => {
          const verb = status === 'graded' ? 'Marked' : 'Sent back';
          const next = queue[0];
          if (next?.lesson) {
            toast.success(`${verb} · next: ${next.lesson.title}`);
            navigate(`/language/mark/${next.lesson_id}`, { replace: true });
          } else {
            toast.success(verb);
            navigate(-1);
          }
        },
      }
    );
  };

  const focused = answered[focus];
  const step = (d: number) =>
    setFocus((f) =>
      Math.min(Math.max(f + d, 0), Math.max(answered.length - 1, 0))
    );
  useHotkeys(
    {
      j: () => step(1),
      arrowdown: () => step(1),
      k: () => step(-1),
      arrowup: () => step(-1),
      y: () => focused && setVerdict(focused, 1),
      n: () => focused && setVerdict(focused, 0),
      u: () => focused && setVerdict(focused, null),
      c: () => focused && openNote(focused),
      'mod+enter': () => giveBack('graded'),
    },
    { enabled: !!lesson && answered.length > 0 }
  );

  if (isLoading) return <ListSkeleton rows={4} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const name = partner?.display_name ?? 'He';
  const seen = at(hisProgress?.opened_at);
  const handed = at(hisProgress?.submitted_at);

  if (!answered.length) {
    return (
      <Empty
        icon="⏳"
        title="Nothing to mark yet"
        hint={
          seen
            ? `${name} opened it ${seen} and hasn't answered.`
            : `${name} hasn't opened this one.`
        }
      />
    );
  }

  const right = verdicts.filter((v) => v?.correct).length;

  /** Her verdict — the desk's right pane, under the answers on a phone. */
  const verdict = (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Kicker as="p">His side</Kicker>
        <p className="font-sans text-xs text-muted">
          {seen ? `opened ${seen}` : 'not opened yet'}
          {handed ? ` · handed in ${handed}` : ''}
        </p>
      </div>
      <Field
        label="Out of a hundred"
        hint={
          scoreTouched
            ? 'Yours'
            : 'From the ticks — change it if that is unfair'
        }
      >
        <Input
          value={score}
          onChange={(e) => {
            setScoreTouched(true);
            setScoreText(e.target.value.replace(/[^\d]/g, ''));
          }}
          inputMode="numeric"
          placeholder="90"
        />
      </Field>
      <Field label="A note for him" hint="The part the app cannot do">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="почти! watch the ending on the second one"
        />
      </Field>
      {clock && (
        <p className="font-sans text-xs text-muted">
          It's {clock} for him
          {asleep
            ? ' — his phone stays quiet; he will find it on his home screen'
            : ''}
          .
        </p>
      )}
      {asleep && (
        <label className="flex items-center gap-2 font-sans text-xs text-fg">
          <Checkbox
            checked={wake}
            onChange={() => setWake((w) => !w)}
            label="Buzz him anyway"
          />
          Buzz him anyway
        </label>
      )}
      <Button
        full
        disabled={saveProgress.isPending || !partner}
        onClick={() => giveBack('graded')}
      >
        Give it back to him
      </Button>
      <Button
        full
        variant="secondary"
        disabled={saveProgress.isPending || !partner}
        onClick={() => giveBack('returned')}
      >
        <RotateCcw size={14} /> Send it back for another go
      </Button>
      {desk && (
        <p className="font-sans text-xs leading-6 text-muted">
          <Kbd>J</Kbd> <Kbd>K</Kbd> move · <Kbd>Y</Kbd> <Kbd>N</Kbd> tick, cross
          · <Kbd>U</Kbd> undo · <Kbd>C</Kbd> a word in the margin ·{' '}
          <Kbd>⌘↵</Kbd> give it back
        </p>
      )}
    </div>
  );

  return (
    <Desk
      rail={
        <LessonTree
          courseId={lesson.courseId}
          currentId={lesson.id}
          mode="read"
        />
      }
      inspector={verdict}
    >
      <div className="curtain-reveal space-y-3">
        <header className="min-w-0">
          <p className="eyebrow">
            {partner?.display_name ?? 'His'} answers · {right} of{' '}
            {answered.length} right
          </p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-semibold text-fg">
            {lesson.title}
          </h1>
        </header>

        <ul className="space-y-2">
          {answered.map((ex, i) => {
            const a = his.get(ex.id)!;
            const v = verdicts[i]!;
            const isFocused = i === focus;
            return (
              <li
                key={ex.id}
                ref={(el) => {
                  rows.current[i] = el;
                }}
                onClick={() => setFocus(i)}
                className={cn(
                  'space-y-1 rounded-lg px-3 py-2.5',
                  v.correct ? 'bg-surface' : 'bg-danger/10',
                  // No alpha on a ring — `ring-gold/40` renders the default blue.
                  isFocused && desk && 'ring-1 ring-gold'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Kicker
                      as="p"
                      tone="muted"
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      {v.correct ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-danger" />
                      )}
                      {i + 1} · {ex.kind}
                      {ex.points > 1 && <span>{ex.points} pts</span>}
                      {a.attempt_no > 1 && (
                        <span className="text-copper">
                          {a.attempt_no} tries
                        </span>
                      )}
                      {v.hers && <span className="text-gold">your call</span>}
                    </Kicker>
                    <p className="font-sans text-sm text-fg">
                      {pick(ex, 'prompt', support) || 'Untitled question'}
                    </p>
                    <p className="font-display text-base text-fg">
                      {shown(a.answer)}
                    </p>
                    {!v.correct && (
                      <p className="font-sans text-xs text-muted">
                        wanted: {acceptedForms(ex.answer).join(' · ') || '—'}
                      </p>
                    )}
                    {a.teacher_note && noteFor !== a.id && (
                      <p className="font-display text-sm italic text-fg">
                        — {a.teacher_note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label="Right"
                      aria-pressed={v.hers && v.correct}
                      onClick={() =>
                        setVerdict(ex, v.hers && v.correct ? null : 1)
                      }
                      className={cn(
                        ROW_TOOL,
                        v.hers && v.correct && 'bg-success/20 text-fg'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Wrong"
                      aria-pressed={v.hers && !v.correct}
                      onClick={() =>
                        setVerdict(ex, v.hers && !v.correct ? null : 0)
                      }
                      className={cn(
                        ROW_TOOL,
                        v.hers && !v.correct && 'bg-danger/20 text-fg'
                      )}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="A word in the margin"
                      onClick={() => openNote(ex)}
                      className={ROW_TOOL}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {noteFor === a.id && (
                  <Textarea
                    autoFocus
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onBlur={saveNote}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveNote();
                      }
                      if (e.key === 'Escape') setNoteFor(null);
                    }}
                    rows={2}
                    placeholder="почти — watch the ending"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Desk>
  );
}
