import { useMemo, useState } from 'react';
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
import { useLesson, useMyAttempts } from '../api/lessons.queries';
import { useAnswerExercise, useSaveProgress } from '../api/lessons.mutations';
import { useLangPrefs } from '../lib/lang-prefs';
import { gradeAnswer, type Grade } from '../lib/exercise-schema';
import { ExerciseView } from '../components/exercises/exercise-view';
import { BlockView } from '../components/block-view';
import type { Exercise } from '../types';

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
  const { data: attempts } = useMyAttempts(lessonId);
  const answer = useAnswerExercise();
  const saveProgress = useSaveProgress();
  const support = useLangPrefs((s) => s.supportLang);
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'));

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [submitted, setSubmitted] = useState(false);

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

  if (isLoading) return <LoadingScreen />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const isExam = lesson.kind === 'exam';
  const exercises = lesson.exercises;

  const markOne = (ex: Exercise) => {
    const given = answers[ex.id];
    const grade = gradeAnswer(ex, given);
    setGrades((g) => ({ ...g, [ex.id]: grade }));
    answer.mutate({
      exercise: ex,
      lessonId: lesson.id,
      answer: given ?? null,
      attemptNo: (priorAttempts.get(ex.id) ?? 0) + 1,
    });
  };

  /**
   * Hand the whole thing in.
   *
   * An exam marks everything at the end — checking your answer as you go is
   * not what an exam is — and the score goes straight onto the progress row
   * she reads.
   */
  const handIn = () => {
    const marks = exercises.map((ex) => {
      const grade = gradeAnswer(ex, answers[ex.id]);
      answer.mutate({
        exercise: ex,
        lessonId: lesson.id,
        answer: answers[ex.id] ?? null,
        attemptNo: (priorAttempts.get(ex.id) ?? 0) + 1,
      });
      return [ex.id, grade] as const;
    });
    setGrades(Object.fromEntries(marks));
    setSubmitted(true);
    const total = marks.reduce((sum, [, g]) => sum + g.score, 0);
    saveProgress.mutate({
      lessonId: lesson.id,
      status: 'submitted',
      score: marks.length ? total / marks.length : null,
    });
    toast.success('Handed in');
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

      {lesson.blocks.map((block) => (
        <BlockView key={block.id} block={block} support={support} />
      ))}

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
                  shown?.correct && 'ring-1 ring-success/40'
                )}
              >
                <p className="eyebrow">
                  {i + 1} of {exercises.length}
                </p>
                <ExerciseView
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
                    disabled={answers[ex.id] === undefined}
                  >
                    Check
                  </Button>
                )}
              </div>
            );
          })}

          {isExam && !submitted && (
            <Button full onClick={handIn}>
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
