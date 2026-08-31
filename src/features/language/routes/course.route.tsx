import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  Pencil,
  Plus,
} from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Desk,
  Dialog,
  Empty,
  Field,
  Input,
  LoadingScreen,
  Segmented,
  useDesk,
  useTopBarAction,
} from '@kernel/ui';
import {
  useCourse,
  useMyProgress,
  useProgress,
  useUnits,
} from '../api/courses.queries';
import { useCreateLesson, useCreateUnit } from '../api/lessons.mutations';
import { CoursesRail } from '../components/courses-rail';
import { dueLabel } from '../lib/due';
import type { Lesson, LessonKind } from '../types';

const KIND_ICON = {
  lesson: FileText,
  homework: Pencil,
  exam: ClipboardCheck,
} as const;

const KIND_LABEL: Record<LessonKind, string> = {
  lesson: 'Lesson',
  homework: 'Homework',
  exam: 'Exam',
};

/**
 * One course: its units, and the lessons inside them.
 *
 * A single scroll rather than a drill-down — a course is a shape you want to
 * see all of, and tapping through three screens to find last week's homework
 * is how a course stops being used.
 */
export function CourseRoute() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading } = useCourse(courseId);
  const { data: units } = useUnits(courseId);
  const { data: progress } = useMyProgress();
  const { data: everyone } = useProgress();
  const { partner } = usePartner();

  /** Lessons he has handed in and she has not marked yet. */
  const toMark = useMemo(
    () =>
      new Set(
        (everyone ?? [])
          .filter(
            (p) => p.user_id === partner?.user_id && p.status === 'submitted'
          )
          .map((p) => p.lesson_id)
      ),
    [everyone, partner?.user_id]
  );
  const createUnit = useCreateUnit();
  const createLesson = useCreateLesson();
  useTableSync('lang_lessons', qk.lang.units(courseId ?? 'none'));
  useDesk();

  const [unitOpen, setUnitOpen] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonKind, setLessonKind] = useState<LessonKind>('lesson');

  useTopBarAction(
    <button
      type="button"
      onClick={() => setUnitOpen(true)}
      aria-label="New unit"
      className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
      style={{ border: '1px solid rgba(228,195,106,.4)' }}
    >
      <Plus className="h-4 w-4" />
    </button>,
    []
  );

  if (isLoading) return <LoadingScreen />;
  if (!course) return <Empty icon="📕" title="No such course" />;

  const list = units ?? [];

  return (
    <Desk rail={<CoursesRail currentId={courseId} />} narrow>
      <div className="curtain-reveal space-y-4">
        <header className="min-w-0">
          <p className="eyebrow">{course.description ?? 'A course of ours'}</p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-semibold text-fg">
            <span className="mr-2">{course.emoji ?? '📘'}</span>
            {course.title}
          </h1>
        </header>

        {list.length === 0 ? (
          <Empty
            icon="🗂️"
            title="Nothing in here yet"
            hint="A unit holds the lessons that belong together."
            action={
              <Button onClick={() => setUnitOpen(true)}>Add a unit</Button>
            }
          />
        ) : (
          list.map((unit) => (
            <section key={unit.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="min-w-0 truncate font-display text-lg text-fg">
                  {unit.title}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setLessonFor(unit.id);
                    setLessonTitle('');
                    setLessonKind('lesson');
                  }}
                  className="shrink-0 font-sans text-xs text-gold"
                >
                  add
                </button>
              </div>

              {unit.lessons.length === 0 ? (
                <p className="font-sans text-xs text-muted">Empty for now.</p>
              ) : (
                <ul className="space-y-1">
                  {unit.lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      done={progress?.get(lesson.id)?.status === 'graded'}
                      score={progress?.get(lesson.id)?.score ?? null}
                      waiting={toMark.has(lesson.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        <Dialog
          placement="auto"
          open={unitOpen}
          onClose={() => setUnitOpen(false)}
          title="New unit"
          size="sm"
        >
          <div className="space-y-3">
            <Field label="Called">
              <Input
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="Getting around"
                autoFocus
              />
            </Field>
            <Button
              full
              disabled={!unitTitle.trim() || createUnit.isPending}
              onClick={() =>
                courseId &&
                createUnit.mutate(
                  { courseId, title: unitTitle, position: list.length },
                  {
                    onSuccess: () => {
                      setUnitOpen(false);
                      setUnitTitle('');
                    },
                  }
                )
              }
            >
              Add unit
            </Button>
          </div>
        </Dialog>

        <Dialog
          placement="auto"
          open={!!lessonFor}
          onClose={() => setLessonFor(null)}
          title="New lesson"
          size="sm"
        >
          <div className="space-y-3">
            <Segmented
              full
              value={lessonKind}
              onChange={(v) => setLessonKind(v as LessonKind)}
              options={[
                { value: 'lesson', label: 'Lesson' },
                { value: 'homework', label: 'Homework' },
                { value: 'exam', label: 'Exam' },
              ]}
            />
            <Field label="Called">
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Asking for the bill"
                autoFocus
              />
            </Field>
            <Button
              full
              disabled={!lessonTitle.trim() || createLesson.isPending}
              onClick={() => {
                const unit = list.find((u) => u.id === lessonFor);
                if (!unit || !courseId) return;
                createLesson.mutate(
                  {
                    courseId,
                    unitId: unit.id,
                    title: lessonTitle,
                    kind: lessonKind,
                    position: unit.lessons.length,
                  },
                  { onSuccess: () => setLessonFor(null) }
                );
              }}
            >
              Add {KIND_LABEL[lessonKind].toLowerCase()}
            </Button>
          </div>
        </Dialog>
      </div>
    </Desk>
  );
}

function LessonRow({
  lesson,
  done,
  score,
  waiting,
}: {
  lesson: Lesson;
  done: boolean;
  score: number | null;
  /** He has handed this in and it has not been marked. */
  waiting: boolean;
}) {
  const Icon = KIND_ICON[lesson.kind as LessonKind] ?? FileText;
  const draft = lesson.status === 'draft';
  return (
    <li>
      <Link
        to={
          waiting
            ? `/language/mark/${lesson.id}`
            : `/language/lesson/${lesson.id}`
        }
        className={cn(
          'lift-press flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5',
          draft && 'opacity-60'
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm font-semibold text-fg">
            {lesson.title}
          </span>
          <span className="flex items-center gap-1.5 font-sans text-[0.68rem] text-muted">
            {draft && <span>draft</span>}
            {lesson.due_on && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {dueLabel(lesson.due_on)}
              </span>
            )}
            {done && score != null && (
              <span className="text-gold">{Math.round(score * 100)}%</span>
            )}
          </span>
        </span>
        {/* The one thing she is waiting for, said plainly. */}
        {waiting && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-sans text-[0.6rem] uppercase tracking-[0.1em] text-accent-fg">
            to mark
          </span>
        )}
      </Link>
    </li>
  );
}
