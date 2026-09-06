import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Check,
  GraduationCap,
  Pencil,
  Presentation,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Desk,
  Empty,
  Kicker,
  ListSkeleton,
  PlayButton,
  toast,
  TopBarButton,
  useDesk,
  useTopBarAction,
} from '@kernel/ui';
import { useMyProgress } from '../api/courses.queries';
import { useLesson, useMyAttempts } from '../api/lessons.queries';
import {
  useAnswerExercise,
  useAnswerExercises,
  useMarkOpened,
  useSaveProgress,
} from '../api/lessons.mutations';
import { isTeacherOf, useLanguages } from '../lib/languages';
import { gradeAnswer, type Grade } from '../lib/exercise-schema';
import { ExerciseView } from '../components/exercises/exercise-view';
import { BlockView } from '../components/block-view';
import { GlossaryPopover } from '../components/glossary-popover';
import { LessonTree } from '../components/lesson-tree';
import { dueLabel } from '../lib/due';
import { verdictOf, weightedScore } from '../lib/marking';
import { useToday } from '../lib/use-today';
import { useClassChannel, type SlideMessage } from '../lib/class-channel';
import type { Attempt, Exercise, MediaBlockData } from '../types';

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
  const markOpened = useMarkOpened();
  const today = useToday();
  const { native: support, ready } = useLanguages();
  // Filtered to THIS lesson: unfiltered, editing any lesson anywhere re-ran
  // this one's whole read.
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });

  const { data: progress } = useMyProgress();
  useDesk();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [handedIn, setHandedIn] = useState(false);
  /** The word he tapped, waiting for its meaning. */
  const [lookup, setLookup] = useState<string | null>(null);
  /** Where she is in the lesson, when she is teaching it live. */
  const [live, setLive] = useState<SlideMessage | null>(null);
  useClassChannel(lessonId ?? undefined, setLive);

  // ONE signing request for every recording on the page.
  const { data: clips } = useSignedUrls(
    BUCKETS.languageAudio,
    Object.values(lesson?.vocabByBlock ?? {})
      .flat()
      .map((w) => w.audio_path),
    { proxy: false }
  );
  const [handingIn, setHandingIn] = useState(false);
  // "Try again": the screen starts over and the old answers stop seeding it.
  const [retrying, setRetrying] = useState(false);
  // Checked THIS sitting. A verdict brought back from last time is shown but
  // does not lock the question - homework is meant to be redone.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  /**
   * An exam stays handed in across a reload.
   *
   * This used to live only in component state, so refreshing offered the
   * "Hand it in" button again on an empty form - and pressing it wrote a
   * second set of answers and overwrote the real score with zero.
   */
  const mine = progress?.get(lessonId ?? '');
  const submitted =
    handedIn ||
    (!retrying && ['submitted', 'graded'].includes(mine?.status ?? ''));

  // Her pencil, not his: the builder is for whoever teaches this language -
  // and only once the pair is known, because for the first half-second the
  // app is guessing, and it guessed him.
  const teacher =
    ready && isTeacherOf({ target_lang: lesson?.targetLang }, support);
  useTopBarAction(
    lessonId && teacher ? (
      <div className="flex items-center gap-1">
        <TopBarButton
          label="Teach it"
          to={`/language/teach/${lessonId}`}
          variant="quiet"
        >
          <Presentation className="h-4 w-4" />
        </TopBarButton>
        <TopBarButton
          label="Edit this lesson"
          to={`/language/build/${lessonId}`}
          variant="quiet"
        >
          <Pencil className="h-4 w-4" />
        </TopBarButton>
      </div>
    ) : null,
    [lessonId, teacher]
  );

  // So she can see he has been here: a quiet row, once per visit.
  const { mutate: noteOpened } = markOpened;
  // Only once the lesson is known: before it loads `teacher` is false for
  // everyone, and she was recorded as having opened her own lesson.
  const targetLang = lesson?.targetLang;
  useEffect(() => {
    if (lessonId && ready && targetLang && !teacher) noteOpened(lessonId);
  }, [lessonId, ready, targetLang, teacher, noteOpened]);

  /** His newest go at each question - how many so far, and her margin on it. */
  const latest = useMemo(() => {
    const out = new Map<string, Attempt>();
    for (const a of attempts ?? []) out.set(a.exercise_id, a);
    return out;
  }, [attempts]);
  const priorAttempts = (ex: Exercise) => latest.get(ex.id)?.attempt_no ?? 0;

  /**
   * What he already answered, back on the screen.
   *
   * Answers and verdicts lived only in component state, so a refresh offered
   * every question again - and homework done in two sittings never counted as
   * done, because "done" was computed from that state. The attempts query
   * already holds the newest answer to each question; it was only being
   * counted. Local state wins where both exist: what he is typing now beats
   * what he typed last time.
   */
  useEffect(() => {
    if (!attempts || !lesson || retrying) return;
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
          // The verdict as it was written, not re-graded against today's
          // answer key: she may have fixed the key since, and the two of them
          // must read the same tick.
          next[a.exercise_id] =
            a.correct == null
              ? gradeAnswer(ex, a.answer)
              : { correct: a.correct, score: a.score ?? (a.correct ? 1 : 0) };
      }
      return next;
    });
  }, [attempts, lesson, retrying]);

  if (isLoading) return <ListSkeleton rows={5} />;
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
    setFresh((f) => new Set(f).add(ex.id));
    answer.mutate({
      exercise: ex,
      lessonId: lesson.id,
      answer: given ?? null,
      attemptNo: priorAttempts(ex) + 1,
    });

    // Homework has to record that it was done, or it sits on the home screen
    // forever getting later - only exams were writing a progress row.
    const done = exercises.every((x) => next[x.id]);
    if (done) setRetrying(false);
    // Once she has marked it, a re-check is practice: the attempt is kept,
    // the mark is hers. (The database refuses the downgrade too.)
    // …and a lesson already handed in is not handed in again on a re-check.
    if (mine?.status === 'graded' || mine?.status === 'submitted') return;
    saveProgress.mutate({
      lessonId: lesson.id,
      status: done ? 'submitted' : 'in_progress',
      score: done
        ? weightedScore(
            exercises.map((x) => ({
              points: x.points,
              score: next[x.id]?.score,
            }))
          )
        : null,
      title: lesson.title,
    });
  };

  /**
   * Hand the whole thing in.
   *
   * An exam marks everything at the end - checking your answer as you go is
   * not what an exam is - and the score goes straight onto the progress row
   * she reads.
   */
  const handIn = async () => {
    if (handingIn) return;
    setHandingIn(true);
    try {
      // One insert for the whole exam, not one request per question - and
      // nothing on screen says "Handed in" until the answers are actually in.
      const marks = await answerMany.mutateAsync({
        lessonId: lesson.id,
        answers: exercises.map((ex) => ({
          exercise: ex,
          answer: answers[ex.id] ?? null,
          attemptNo: priorAttempts(ex) + 1,
        })),
      });
      setGrades(Object.fromEntries(marks.map((m) => [m.exerciseId, m.grade])));
      setFresh(new Set(marks.map((m) => m.exerciseId)));
      setHandedIn(true);
      setRetrying(false);
      await saveProgress.mutateAsync({
        lessonId: lesson.id,
        status: 'submitted',
        score: weightedScore(
          marks.map((m) => ({
            points: exercises.find((x) => x.id === m.exerciseId)?.points,
            score: m.grade.score,
          }))
        ),
        title: lesson.title,
      });
      toast.success('Handed in');
    } catch {
      /* the mutation has already said what went wrong */
    } finally {
      setHandingIn(false);
    }
  };

  /** Another go: the old answers come off the screen, the record stays. */
  const tryAgain = () => {
    setAnswers({});
    setGrades({});
    setFresh(new Set());
    setHandedIn(false);
    setRetrying(true);
  };

  const answeredCount = Object.keys(grades).length;
  const allDone = exercises.length > 0 && answeredCount === exercises.length;
  const scored = Object.values(grades).filter((g) => g.correct).length;

  /** One question, wherever it sits in the page. */
  const exerciseCard = (ex: Exercise) => {
    const i = exercises.indexOf(ex);
    const grade = grades[ex.id] ?? null;
    // In an exam nothing is revealed until it is handed in.
    const shown = isExam ? (submitted ? grade : null) : grade;
    // Her tick, once she has given one, beats the app's.
    const a = retrying ? undefined : latest.get(ex.id);
    const hers = a ? verdictOf(a) : null;
    const right = hers?.hers ? hers.correct : shown?.correct;
    return (
      <div
        key={ex.id}
        className={cn(
          'space-y-2 rounded-lg bg-surface px-3 py-2.5',
          right && 'ring-1 ring-success'
        )}
      >
        <Kicker as="p" tone="muted">
          {i + 1} of {exercises.length}
        </Kicker>
        <ExerciseView
          target={lesson.targetLang}
          exercise={ex}
          support={support}
          value={answers[ex.id]}
          onChange={(v) => {
            setAnswers((a) => ({ ...a, [ex.id]: v }));
            // A changed answer drops last time's verdict until it is checked.
            if (!isExam)
              setGrades((g) => {
                if (!(ex.id in g)) return g;
                const rest = { ...g };
                delete rest[ex.id];
                return rest;
              });
          }}
          grade={shown}
          disabled={isExam ? submitted : fresh.has(ex.id)}
        />
        {a?.teacher_note && (
          <p className="font-display text-sm italic text-fg">
            - {a.teacher_note}
          </p>
        )}
        {a?.teacher_audio_path && (
          <div className="flex items-center gap-2">
            <PlayButton
              bucket={BUCKETS.languageAudio}
              path={a.teacher_audio_path}
              size="sm"
              label="Her voice on this one"
            />
            <span className="font-sans text-xs text-muted">
              a word from her, out loud
            </span>
          </div>
        )}
        {!isExam && !fresh.has(ex.id) && (
          <Button
            full
            variant="secondary"
            onClick={() => markOne(ex)}
            // Not until his earlier attempts are known - the attempt
            // number would collide with one already written.
            disabled={answers[ex.id] === undefined || attemptsLoading}
          >
            Check
          </Button>
        )}
      </div>
    );
  };

  return (
    <Desk
      rail={
        <LessonTree
          courseId={lesson.courseId}
          currentId={lesson.id}
          mode="read"
        />
      }
      narrow
    >
      <div className="curtain-reveal space-y-3">
        <header className="min-w-0">
          <p className="eyebrow">
            {lesson.kind === 'homework'
              ? 'Homework'
              : lesson.kind === 'exam'
                ? 'Exam'
                : 'Lesson'}
            {lesson.due_on ? ` - due ${dueLabel(lesson.due_on, today)}` : ''}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-semibold text-fg">
            {lesson.title}
          </h1>
          {lesson.subtitle && (
            <p className="font-sans text-sm text-muted">{lesson.subtitle}</p>
          )}
          {/* The words of THIS lesson, drilled on their own - not the whole
              schedule, which is what tonight's practice should be about. */}
          {!teacher && Object.keys(lesson.vocabByBlock).length > 0 && (
            <Link
              to={`/language/study?lesson=${lesson.id}`}
              className="mt-1 inline-flex items-center gap-1 font-sans text-xs text-gold hover:underline"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Practise these words
            </Link>
          )}
        </header>

        {/* What came back. The whole point of handing work in. */}
        {mine &&
          ['graded', 'returned', 'submitted'].includes(mine.status) &&
          !retrying && (
            <section className="space-y-1 rounded-lg bg-surface-2 px-4 py-3">
              <p className="eyebrow">
                {mine.status === 'graded'
                  ? `Marked${mine.score != null ? ` - ${Math.round(mine.score * 100)}%` : ''}`
                  : mine.status === 'returned'
                    ? 'Sent back - have another go'
                    : "Handed in - she'll see it"}
              </p>
              {mine.status !== 'submitted' && mine.teacher_note && (
                <p className="font-display text-base italic leading-snug text-fg">
                  {mine.teacher_note}
                </p>
              )}
              {mine.status !== 'submitted' && mine.teacher_audio_path && (
                <div className="flex items-center gap-2">
                  <PlayButton
                    bucket={BUCKETS.languageAudio}
                    path={mine.teacher_audio_path}
                    size="sm"
                    label="A voice note from her"
                  />
                  <span className="font-sans text-xs text-muted">
                    she left you a voice note
                  </span>
                </div>
              )}
              {mine.status === 'returned' && (
                <Button size="xs" onClick={tryAgain}>
                  <RotateCcw size={13} /> Try again
                </Button>
              )}
            </section>
          )}

        {/* She is teaching this right now: a line that follows her. */}
        {live && !teacher && live.blockId && (
          <button
            type="button"
            onClick={() =>
              document
                .getElementById(`block-${live.blockId}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="lift-press sticky top-0 z-10 w-full rounded-full bg-accent px-3 py-1.5 font-sans text-xs text-accent-fg shadow-loge"
          >
            She is on {live.index + 1} of {live.total} - follow along
          </button>
        )}

        {/* Hers to select and copy - a lesson on a computer is a document. The
            questions sit where she put them: after the block they belong to. */}
        {lesson.blocks.map((block) => (
          <div key={block.id} id={`block-${block.id}`} className="space-y-3">
            <div data-readable>
              <BlockView
                block={block}
                support={support}
                target={lesson.targetLang}
                vocab={lesson.vocabByBlock[block.id]}
                media={mediaFor(block)}
                onWord={setLookup}
                clips={clips}
              />
            </div>
            {(lesson.exercisesByBlock[block.id] ?? []).map(exerciseCard)}
          </div>
        ))}

        {lesson.looseExercises.map(exerciseCard)}

        <GlossaryPopover
          word={lookup}
          target={lesson.targetLang}
          support={support}
          onClose={() => setLookup(null)}
        />

        {exercises.length > 0 && (
          <section className="space-y-3">
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
    </Desk>
  );
}
