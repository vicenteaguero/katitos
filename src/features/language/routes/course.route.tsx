import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Card,
  Desk,
  Dialog,
  DragHandle,
  Empty,
  Field,
  InlineEdit,
  Input,
  ListSkeleton,
  ProgressBar,
  ROW_TOOL_TOUCH,
  SectionLabel,
  SortableList,
  StickyFooter,
  toast,
  TopBarPill,
  useDesk,
  useScreenChrome,
  type DragHandleProps,
} from '@kernel/ui';
import {
  useCourse,
  useMyProgress,
  useProgress,
  useUnits,
} from '../api/courses.queries';
import {
  useCreateUnit,
  useDeleteLesson,
  useDeleteUnit,
  useReorderLessons,
  useReorderUnits,
  useRestoreLesson,
  useUpdateUnit,
} from '../api/lessons.mutations';
import { isTeacherOf, useLanguages } from '../lib/languages';
import { kindIcon, kindLabel } from '../lib/lesson-kinds';
import { CoursesRail } from '../components/courses-rail';
import { NewLessonSheet } from '../components/new-lesson-sheet';
import { dueLabel } from '../lib/due';
import { useToday } from '../lib/use-today';
import { LANG_FLAGS, type Lang, type Lesson } from '../types';

/**
 * One course: where you are in it, its units, and the lessons inside them.
 *
 * A single scroll rather than a drill-down - a course is a shape you want to
 * see all of, and tapping through three screens to find last week's homework
 * is how a course stops being used. The teacher's tools (drag, rename,
 * delete) live behind Edit so his rows and hers read the same.
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
  /** What he has been marked on, for the teacher's count. */
  const partnerDone = useMemo(
    () =>
      new Map(
        (everyone ?? [])
          .filter((p) => p.user_id === partner?.user_id)
          .map((p) => [p.lesson_id, p.status] as const)
      ),
    [everyone, partner?.user_id]
  );
  const createUnit = useCreateUnit();
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

  const [editing, setEditing] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  /** `null` closed, `''` any unit, an id for that unit. */
  const [lessonFor, setLessonFor] = useState<string | null>(null);

  // Only the one who teaches this course builds it.
  const teacher = ready && isTeacherOf(course, native);
  useScreenChrome(
    {
      title: 'Course',
      stage: 'house',
      action: teacher ? (
        <TopBarPill
          label={editing ? 'Done editing' : 'Edit this course'}
          tone={editing ? 'accent' : 'quiet'}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? 'Done' : 'Edit'}
        </TopBarPill>
      ) : null,
    },
    [teacher, editing]
  );

  if (isLoading) return <ListSkeleton rows={4} />;
  if (!course) return <Empty icon="📕" title="No such course" />;

  const list = units ?? [];
  const lessons = list.flatMap((u) => u.lessons);
  const published = lessons.filter((l) => l.status === 'published');
  const isDone = (l: Lesson) =>
    teacher
      ? partnerDone.get(l.id) === 'graded'
      : progress?.get(l.id)?.status === 'graded';
  const done = published.filter(isDone).length;

  // Where to pick up: his next unfinished lesson; her next thing to mark,
  // or the lesson she was writing.
  const next = teacher
    ? (published.find((l) => toMark.has(l.id)) ??
      lessons.find((l) => l.status === 'draft') ??
      lessons[lessons.length - 1])
    : published.find((l) => {
        const st = progress?.get(l.id)?.status;
        return st !== 'graded' && st !== 'submitted';
      });
  const nextTo = next
    ? teacher
      ? toMark.has(next.id)
        ? `/language/mark/${next.id}`
        : `/language/build/${next.id}`
      : `/language/lesson/${next.id}`
    : null;
  const nextVerb = next
    ? teacher
      ? toMark.has(next.id)
        ? 'Mark'
        : 'Open'
      : 'Continue'
    : null;

  const heroLine = [
    course.description,
    `${published.length} ${published.length === 1 ? 'lesson' : 'lessons'}`,
    done > 0 ? `${done} ${teacher ? 'marked' : 'done'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Desk rail={<CoursesRail currentId={courseId} />} narrow>
      <div className="curtain-reveal space-y-5 pb-2">
        <Card tone="hero" className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-2 text-2xl">
              {course.emoji ?? LANG_FLAGS[course.target_lang as Lang] ?? '📘'}
            </span>
            <span className="min-w-0 flex-1">
              <h1 className="truncate font-sans text-[19px] font-extrabold text-fg">
                {course.title}
              </h1>
              <span className="block truncate font-sans text-xs font-medium text-muted">
                {heroLine}
              </span>
            </span>
          </div>
          {published.length > 0 && (
            <ProgressBar
              value={done}
              max={published.length}
              label={teacher ? 'Marked' : 'Done'}
            />
          )}
          {next && nextTo && (
            <Link
              to={nextTo}
              className="lift-press flex h-11 items-center justify-center gap-1.5 rounded bg-accent font-sans text-[15px] font-bold text-accent-fg outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="truncate">
                {nextVerb}: {next.title}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </Card>

        {list.length === 0 ? (
          <Empty
            icon="🗂️"
            title="Nothing in here yet"
            hint="A unit holds the lessons that belong together."
            action={
              teacher ? (
                <Button onClick={() => setUnitOpen(true)}>New unit</Button>
              ) : undefined
            }
          />
        ) : (
          <SortableList
            items={list}
            keyOf={(u) => u.id}
            disabled={!editing || reorderUnits.isPending}
            className="space-y-5"
            onReorder={(next) =>
              courseId &&
              reorderUnits.mutate({ courseId, ids: next.map((u) => u.id) })
            }
          >
            {(unit, i, handle) => {
              const unitPublished = unit.lessons.filter(
                (l) => l.status === 'published'
              );
              const unitDone = unitPublished.filter(isDone).length;
              const note =
                unit.lessons.length === 0
                  ? 'empty for now'
                  : unitPublished.length > 0 && unitDone === 0
                    ? 'starts here'
                    : unitPublished.length > 0
                      ? `${unitDone} of ${unitPublished.length} done`
                      : 'drafts';
              return (
                <section>
                  {editing ? (
                    <div className="mb-1.5 flex min-h-[44px] items-center gap-1">
                      <DragHandle {...handle} />
                      <span className="min-w-0 flex-1 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                        <InlineEdit
                          value={unit.title}
                          label="Unit"
                          onSave={(title) =>
                            courseId &&
                            updateUnit.mutate({ id: unit.id, courseId, title })
                          }
                        />
                      </span>
                      <button
                        type="button"
                        aria-label="add"
                        title="New lesson in this unit"
                        onClick={() => setLessonFor(unit.id)}
                        className={cn(ROW_TOOL_TOUCH, 'text-gold')}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {unit.lessons.length === 0 && (
                        <button
                          type="button"
                          aria-label="Delete this empty unit"
                          onClick={() =>
                            courseId &&
                            deleteUnit.mutate({ id: unit.id, courseId })
                          }
                          className={ROW_TOOL_TOUCH}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <SectionLabel note={note}>
                      Unit {i + 1}, {unit.title}
                    </SectionLabel>
                  )}

                  {unit.lessons.length > 0 && (
                    <Card tone="hairline" className="p-0">
                      <SortableList
                        items={unit.lessons}
                        keyOf={(l) => l.id}
                        disabled={!editing || reorderLessons.isPending}
                        className="space-y-0 divide-y divide-fg/5"
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
                            done={isDone(lesson)}
                            score={
                              teacher
                                ? null
                                : (progress?.get(lesson.id)?.score ?? null)
                            }
                            waiting={toMark.has(lesson.id)}
                            today={today}
                            handle={editing ? lessonHandle : undefined}
                            onDelete={
                              editing
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
                    </Card>
                  )}
                </section>
              );
            }}
          </SortableList>
        )}

        {editing && (
          <Button variant="outline" size="xs" onClick={() => setUnitOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New unit
          </Button>
        )}

        {teacher && !editing && courseId && (
          <StickyFooter>
            <Button full onClick={() => setLessonFor('')}>
              <Plus className="h-4 w-4" /> New lesson
            </Button>
          </StickyFooter>
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
                tone="ink"
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

        {courseId && (
          <NewLessonSheet
            open={lessonFor !== null}
            onClose={() => setLessonFor(null)}
            courseId={courseId}
            units={list}
            unitId={lessonFor || null}
          />
        )}
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
  /** Drag to reorder - the teacher's, in edit mode. */
  handle?: DragHandleProps;
  onDelete?: () => void;
}) {
  const Icon = kindIcon(lesson.kind);
  const draft = lesson.status === 'draft';
  const editing = !!handle;
  const meta = [
    kindLabel(lesson.kind),
    draft
      ? 'draft: only you see it'
      : done && score != null
        ? `marked ${Math.round(score * 100)}%`
        : done
          ? 'marked'
          : lesson.due_on
            ? `due ${dueLabel(lesson.due_on, today)}`
            : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3.5',
        editing ? 'py-1' : 'py-0',
        draft && 'opacity-60'
      )}
    >
      {handle && <DragHandle {...handle} />}
      <Link
        to={
          waiting
            ? `/language/mark/${lesson.id}`
            : `/language/lesson/${lesson.id}`
        }
        className="lift-press flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
            done
              ? 'bg-success/[0.16] text-[#a9b37e]'
              : 'bg-surface-2 text-gold',
            draft && 'text-muted'
          )}
        >
          {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-sans text-[14.5px] font-bold text-fg">
            {lesson.title}
          </span>
          <span className="block font-sans text-xs font-medium text-muted">
            {meta}
          </span>
        </span>
        {/* The one thing she is waiting for, said plainly. */}
        {waiting && !editing && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.06em] text-accent-fg">
            To mark
          </span>
        )}
        {!editing && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
      </Link>
      {onDelete && (
        <button
          type="button"
          aria-label="Put this lesson away"
          onClick={onDelete}
          className={ROW_TOOL_TOUCH}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
