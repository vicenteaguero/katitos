import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Desk,
  Dialog,
  DragHandle,
  Empty,
  Field,
  Fieldset,
  InlineEdit,
  Input,
  ListSkeleton,
  OptionButton,
  ROW_TOOL,
  Segmented,
  SortableList,
  toast,
  TopBarButton,
  useDesk,
  useTopBarAction,
  type DragHandleProps,
} from '@kernel/ui';
import {
  useCourse,
  useMyProgress,
  useProgress,
  useUnits,
} from '../api/courses.queries';
import {
  useCreateLesson,
  useCreateUnit,
  useDeleteLesson,
  useDeleteUnit,
  useReorderLessons,
  useReorderUnits,
  useRestoreLesson,
  useUpdateUnit,
} from '../api/lessons.mutations';
import { defaultTemplateFor, LESSON_TEMPLATES } from '../lib/templates';
import { isTeacherOf, useLanguages } from '../lib/languages';
import { CoursesRail } from '../components/courses-rail';
import { dueLabel } from '../lib/due';
import { useToday } from '../lib/use-today';
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
 * A single scroll rather than a drill-down - a course is a shape you want to
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
  const navigate = useNavigate();

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
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const reorderUnits = useReorderUnits();
  const reorderLessons = useReorderLessons();
  const deleteLesson = useDeleteLesson();
  const restoreLesson = useRestoreLesson();
  const { native, ready } = useLanguages();
  const today = useToday();
  useTableSync('lang_lessons', qk.lang.units(courseId ?? 'none'));
  useDesk();

  const [unitOpen, setUnitOpen] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonKind, setLessonKind] = useState<LessonKind>('lesson');
  const [template, setTemplate] = useState(defaultTemplateFor('lesson'));

  // Only the one who teaches this course builds it.
  const teacher = ready && isTeacherOf(course, native);
  useTopBarAction(
    teacher ? (
      <TopBarButton label="New unit" onClick={() => setUnitOpen(true)}>
        <Plus className="h-4 w-4" />
      </TopBarButton>
    ) : null,
    [teacher]
  );

  if (isLoading) return <ListSkeleton rows={4} />;
  if (!course) return <Empty icon="📕" title="No such course" />;

  const list = units ?? [];

  return (
    <Desk rail={<CoursesRail currentId={courseId} />} narrow>
      <div className="curtain-reveal space-y-3">
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
          <SortableList
            items={list}
            keyOf={(u) => u.id}
            disabled={!teacher || reorderUnits.isPending}
            className="space-y-4"
            onReorder={(next) =>
              courseId &&
              reorderUnits.mutate({ courseId, ids: next.map((u) => u.id) })
            }
          >
            {(unit, _i, handle) => (
              <section className="space-y-1.5">
                <div className="flex items-center gap-1">
                  {teacher && <DragHandle {...handle} />}
                  <h2 className="min-w-0 flex-1 truncate font-display text-lg text-fg">
                    {teacher ? (
                      <InlineEdit
                        value={unit.title}
                        label="Unit"
                        onSave={(title) =>
                          courseId &&
                          updateUnit.mutate({ id: unit.id, courseId, title })
                        }
                      />
                    ) : (
                      unit.title
                    )}
                  </h2>
                  {teacher && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setLessonFor(unit.id);
                          setLessonTitle('');
                          setLessonKind('lesson');
                          setTemplate(defaultTemplateFor('lesson'));
                        }}
                        className="shrink-0 rounded px-2 py-1 font-sans text-xs text-gold hover:bg-fg/5"
                      >
                        add
                      </button>
                      {unit.lessons.length === 0 && (
                        <button
                          type="button"
                          aria-label="Delete this empty unit"
                          onClick={() =>
                            courseId &&
                            deleteUnit.mutate({ id: unit.id, courseId })
                          }
                          className={ROW_TOOL}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {unit.lessons.length === 0 ? (
                  <p className="font-sans text-xs text-muted">Empty for now.</p>
                ) : (
                  <SortableList
                    items={unit.lessons}
                    keyOf={(l) => l.id}
                    disabled={!teacher || reorderLessons.isPending}
                    className="space-y-1"
                    onReorder={(next) =>
                      courseId &&
                      reorderLessons.mutate({
                        courseId,
                        ids: next.map((l) => l.id),
                      })
                    }
                  >
                    {(lesson, _k, lessonHandle) => (
                      <LessonRow
                        lesson={lesson}
                        done={progress?.get(lesson.id)?.status === 'graded'}
                        score={progress?.get(lesson.id)?.score ?? null}
                        waiting={toMark.has(lesson.id)}
                        today={today}
                        handle={teacher ? lessonHandle : undefined}
                        onDelete={
                          teacher
                            ? () =>
                                courseId &&
                                deleteLesson.mutate(
                                  { id: lesson.id, courseId },
                                  {
                                    onSuccess: () =>
                                      toast.success('Lesson put away', {
                                        key: 'lesson-put-away',
                                        action: {
                                          label: 'Undo',
                                          onClick: () =>
                                            restoreLesson.mutate({
                                              id: lesson.id,
                                              courseId,
                                            }),
                                        },
                                      }),
                                  }
                                )
                            : undefined
                        }
                      />
                    )}
                  </SortableList>
                )}
              </section>
            )}
          </SortableList>
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
              onChange={(v) => {
                // Homework and exams start from their own sheet, not a lesson's.
                setLessonKind(v as LessonKind);
                setTemplate(defaultTemplateFor(v as LessonKind));
              }}
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
            <Fieldset
              label="Start from"
              hint="Empty blocks in the usual order - throw away what you do not need"
            >
              <div className="grid grid-cols-2 gap-1.5">
                {LESSON_TEMPLATES.filter((t) => t.for.includes(lessonKind)).map(
                  (t) => (
                    <OptionButton
                      key={t.id}
                      state={template === t.id ? 'picked' : 'idle'}
                      onClick={() => setTemplate(t.id)}
                    >
                      <span className="block font-semibold">{t.title}</span>
                      <span className="block text-[0.68rem] opacity-80">
                        {t.hint}
                      </span>
                    </OptionButton>
                  )
                )}
              </div>
            </Fieldset>
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
                    blocks: LESSON_TEMPLATES.find((t) => t.id === template)
                      ?.blocks,
                  },
                  {
                    onSuccess: (id) => {
                      setLessonFor(null);
                      navigate(`/language/build/${id}`);
                    },
                  }
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
  today,
  handle,
  onDelete,
}: {
  lesson: Lesson;
  done: boolean;
  score: number | null;
  /** He has handed this in and it has not been marked. */
  waiting: boolean;
  /** The couple's day, for "due tomorrow". */
  today: string;
  /** Drag to reorder - the teacher's, not his. */
  handle?: DragHandleProps;
  onDelete?: () => void;
}) {
  const Icon = KIND_ICON[lesson.kind as LessonKind] ?? FileText;
  const draft = lesson.status === 'draft';
  return (
    <div className="flex items-center gap-1">
      {handle && <DragHandle {...handle} />}
      <Link
        to={
          waiting
            ? `/language/mark/${lesson.id}`
            : `/language/lesson/${lesson.id}`
        }
        className={cn(
          'lift-press flex min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5',
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
                {dueLabel(lesson.due_on, today)}
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
      {onDelete && (
        <button
          type="button"
          aria-label="Put this lesson away"
          onClick={onDelete}
          className={ROW_TOOL}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
