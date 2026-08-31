import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, Pencil, Send } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  LoadingScreen,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useMyProgress } from '../api/courses.queries';
import { useLesson, useMyAttempts } from '../api/lessons.queries';
import {
  useAnswerExercise,
  useAnswerExercises,
  useSaveProgress,
} from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import { gradeAnswer, type Grade } from '../lib/exercise-schema';
import { ExerciseView } from '../components/exercises/exercise-view';
import { BlockView } from '../components/block-view';
import type { Exercise, MediaBlockData } from '../types';

/**
 * A lesson, as he reads it.
 *
 * Blocks first, then whatever she asked him to try. Homework and exams are the
 * same screen with a different ending: an exam is marked all at once when he
 * hands it in, a lesson tells him straight away.
 */
export function LessonRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: attempts, isLoading: attemptsLoading } =
    useMyAttempts(lessonId);
  const answer = useAnswerExercise();
  const answerMany = useAnswerExercises();
  const saveProgress = useSaveProgress();
  const { native: support } = useLanguages();
  // Filtered to THIS lesson: unfiltered, editing any lesson anywhere re-ran
  // this one's whole read.
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });

  const { data: progress } = useMyProgress();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [handedIn, setHandedIn] = useState(false);
  const [handingIn, setHandingIn] = useState(false);

  /**
   * An exam stays handed in across a reload.
   *
   * This used to live only in component state, so refreshing offered the
   * "Hand it in" button again on an empty form — and pressing it wrote a
   * second set of answers and overwrote the real score with zero.
   */
  const mine = progress?.get(lessonId ?? '');
  const submitted =
    handedIn || ['submitted', 'graded'].includes(mine?.status ?? '');

  useTopBarAction(
    lessonId ? (
      <Link
        to={`/language/build/${lessonId}`}
        aria-label="Edit this lesson"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-gold shadow-loge"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Pencil className="h-4 w-4" />
      </Link>
    ) : null,
    [lessonId]
  );

  /** How many times he has already had a go at each question. */
  const priorAttempts = useMemo(() => {
    const out = new Map<string, number>();
    for (const a of attempts ?? []) out.set(a.exercise_id, a.attempt_no);
    return out;
  }, [attempts]);

  /**
   * What he already answered, back on the screen.
   *
   * Answers and verdicts lived only in component state, so a refresh offered
   * every question again — and homework done in two sittings never counted as
   * done, because "done" was computed from that state. The attempts query
   * already holds the newest answer to each question; it was only being
   * counted. Local state wins where both exist: what he is typing now beats
   * what he typed last time.
   */
  useEffect(() => {
    if (!attempts || !lesson) return;
    const byId = new Map(lesson.exercises.map((ex) => [ex.id, ex]));
    setAnswers((current) => {
      const next = { ...current };
      for (const a of attempts) {
        if (!(a.exercise_id in next) && byId.has(a.exercise_id)) {
          next[a.exercise_id] = a.answer;
        }
      }
      return next;
    });
    setGrades((current) => {
      const next = { ...current };
      for (const a of attempts) {
        const ex = byId.get(a.exercise_id);
        if (ex && !(a.exercise_id in next))
          next[a.exercise_id] = gradeAnswer(ex, a.answer);
      }
      return next;
    });
  }, [attempts, lesson]);

  if (isLoading) return <LoadingScreen />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const isExam = lesson.kind === 'exam';
  const exercises = lesson.exercises;

  /** The attachment a media block points at, if it has been given one yet. */
  const mediaFor = (block: (typeof lesson.blocks)[number]) => {
    if (block.kind !== 'media') return undefined;
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  const markOne = (ex: Exercise) => {
    const given = answers[ex.id];
    const grade = gradeAnswer(ex, given);
    const next = { ...grades, [ex.id]: grade };
    setGrades(next);
    answer.mutate({
      exercise: ex,
      lessonId: lesson.id,
      answer: given ?? null,
      attemptNo: (priorAttempts.get(ex.id) ?? 0) + 1,
    });

    // Homework has to record that it was done, or it sits on the home screen
    // forever getting later — only exams were writing a progress row.
    const done = exercises.every((x) => next[x.id]);
    const total = exercises.reduce(
      (sum, x) => sum + (next[x.id]?.score ?? 0),
      0
    );
    // Once she has marked it, a re-check is practice: the attempt is kept,
    // the mark is hers. (The database refuses the downgrade too.)
    if (mine?.status === 'graded') return;
    saveProgress.mutate({
      lessonId: lesson.id,
      status: done ? 'submitted' : 'in_progress',
      score: done && exercises.length ? total / exercises.length : null,
    });
  };

  /**
   * Hand the whole thing in.
   *
   * An exam marks everything at the end — checking your answer as you go is
   * not what an exam is — and the score goes straight onto the progress row
   * she reads.
   */
  const handIn = async () => {
    if (handingIn) return;
    setHandingIn(true);
    try {
      // One insert for the whole exam, not one request per question — and
      // nothing on screen says "Handed in" until the answers are actually in.
      const marks = await answerMany.mutateAsync({
        lessonId: lesson.id,
        answers: exercises.map((ex) => ({
          exercise: ex,
          answer: answers[ex.id] ?? null,
          attemptNo: (priorAttempts.get(ex.id) ?? 0) + 1,
        })),
      });
      setGrades(Object.fromEntries(marks.map((m) => [m.exerciseId, m.grade])));
      setHandedIn(true);
      const total = marks.reduce((sum, m) => sum + m.grade.score, 0);
      await saveProgress.mutateAsync({
        lessonId: lesson.id,
        status: 'submitted',
        score: marks.length ? total / marks.length : null,
      });
      toast.success('Handed in');
    } catch {
      /* the mutation has already said what went wrong */
    } finally {
      setHandingIn(false);
    }
  };

  const answeredCount = Object.keys(grades).length;
  const allDone = exercises.length > 0 && answeredCount === exercises.length;
  const scored = Object.values(grades).filter((g) => g.correct).length;

  return (
    <div className="curtain-reveal space-y-4">
      <header className="min-w-0">
        <p className="eyebrow">
          {lesson.kind === 'homework'
            ? 'Homework'
            : lesson.kind === 'exam'
              ? 'Exam'
              : 'Lesson'}
          {lesson.due_on ? ` · due ${lesson.due_on}` : ''}
        </p>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-fg">
          {lesson.title}
        </h1>
        {lesson.subtitle && (
          <p className="font-sans text-sm text-muted">{lesson.subtitle}</p>
        )}
      </header>

      {/* What she wrote back. The whole point of handing work in. */}
      {mine?.status === 'graded' && (
        <section className="space-y-1 rounded-lg bg-surface-2 px-4 py-3">
          <p className="eyebrow">
            Marked
            {mine.score != null ? ` · ${Math.round(mine.score * 100)}%` : ''}
          </p>
          {mine.teacher_note && (
            <p className="font-display text-base italic leading-snug text-fg">
              {mine.teacher_note}
            </p>
          )}
        </section>
      )}

      {/* Hers to select and copy — a lesson on a computer is a document. */}
      <div data-readable className="space-y-4">
        {lesson.blocks.map((block) => (
          <BlockView
            key={block.id}
            block={block}
            support={support}
            target={lesson.targetLang}
            vocab={lesson.vocabByBlock[block.id]}
            media={mediaFor(block)}
          />
        ))}
      </div>

      {exercises.length > 0 && (
        <section className="space-y-3">
          {exercises.map((ex, i) => {
            const grade = grades[ex.id] ?? null;
            // In an exam nothing is revealed until it is handed in.
            const shown = isExam ? (submitted ? grade : null) : grade;
            return (
              <div
                key={ex.id}
                className={cn(
                  'space-y-2 rounded-lg bg-surface px-3 py-3',
                  // No alpha on a ring: `ring-success/40` renders Tailwind's
                  // default blue, not green.
                  shown?.correct && 'ring-1 ring-success'
                )}
              >
                <p className="eyebrow">
                  {i + 1} of {exercises.length}
                </p>
                <ExerciseView
                  target={lesson.targetLang}
                  exercise={ex}
                  support={support}
                  value={answers[ex.id]}
                  onChange={(v) => setAnswers((a) => ({ ...a, [ex.id]: v }))}
                  grade={shown}
                  disabled={isExam ? submitted : !!grade}
                />
                {!isExam && !grade && (
                  <Button
                    full
                    variant="secondary"
                    onClick={() => markOne(ex)}
                    // Not until his earlier attempts are known — the attempt
                    // number would collide with one already written.
                    disabled={answers[ex.id] === undefined || attemptsLoading}
                  >
                    Check
                  </Button>
                )}
              </div>
            );
          })}

          {isExam && !submitted && (
            <Button
              full
              onClick={() => void handIn()}
              disabled={handingIn || attemptsLoading}
            >
              <Send size={15} /> Hand it in
            </Button>
          )}

          {(submitted || (!isExam && allDone)) && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-3">
              <Check className="h-5 w-5 shrink-0 text-gold" />
              <p className="font-sans text-sm text-fg">
                {scored} of {exercises.length} right
              </p>
            </div>
          )}
        </section>
      )}

      {lesson.blocks.length === 0 && exercises.length === 0 && (
        <Empty
          icon="✍️"
          title="Nothing here yet"
          hint="This lesson is still being written."
          action={
            <Link to={`/language/build/${lesson.id}`}>
              <Button variant="secondary">Write it</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
