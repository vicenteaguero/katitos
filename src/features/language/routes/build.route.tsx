import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Copy,
  Eye,
  Plus,
  Presentation,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Desk,
  Empty,
  ListSkeleton,
  SectionLabel,
  Segmented,
  SortableList,
  StickyFooter,
  toast,
  TopBarPill,
  useDesk,
  useIsDesk,
  useScreenChrome,
} from '@kernel/ui';
import { useLesson } from '../api/lessons.queries';
import { useUnits } from '../api/courses.queries';
import {
  useCreateBlock,
  useCreateHomework,
  useDeleteBlock,
  useDeleteExercise,
  useDuplicateBlock,
  useDuplicateExercise,
  useDuplicateLesson,
  useReorderBlocks,
  useReorderExercises,
  useRestoreBlock,
  useRestoreExercise,
  useUpdateBlock,
  useUpdateLesson,
} from '../api/lessons.mutations';
import { supportLangs, useLanguages } from '../lib/languages';
import { homeworkFrom } from '../lib/homework';
import { kindLabel } from '../lib/lesson-kinds';
import { dueLabel } from '../lib/due';
import { useToday } from '../lib/use-today';
import { ExerciseEditor } from '../components/exercises/exercise-editor';
import { MediaBlockEditor } from '../components/media-block-editor';
import { LessonTree } from '../components/lesson-tree';
import { VocabPickerSheet } from '../components/vocab-picker-sheet';
import { BlockEditor } from '../components/build/block-editor';
import {
  InsertGrid,
  InsertHere,
  InsertMenu,
  type InsertKind,
} from '../components/build/insert-menu';
import { LessonSettingsSheet } from '../components/build/lesson-settings-sheet';
import { PublishCard } from '../components/build/publish-card';
import { QuestionCard } from '../components/build/question-card';
import type { Json } from '@kernel/supabase';
import type {
  Block,
  BlockKind,
  Exercise,
  Lang,
  MediaBlockData,
} from '../types';
import { LANG_NATIVE_LABELS } from '../types';

/** Which question the editor is open on, and where a new one goes. */
type Editing = { exercise: Exercise | null; blockId: string | null };

/** What a block is called in the question editor's subtitle. */
const BLOCK_NAME: Record<BlockKind, string> = {
  text: 'Text',
  vocab: 'Words',
  media: 'Material',
  exercise: 'Question',
  divider: 'Break',
  table: 'Table',
};

/**
 * Where she builds the lesson.
 *
 * On a desk: the course down the left, the page in the middle as a document
 * with "+ Insert here" between its blocks, and one organised inspector on
 * the right: publish, insert, tools. On a phone the same page, one language
 * of explanation at a time, and one "+ Insert" that stays at the bottom.
 * Questions sit inside the page, after the block they belong to; the ones
 * with no block come at the end.
 */
export function BuildRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  useDesk();
  const desk = useIsDesk();
  const navigate = useNavigate();
  const { data: lesson, isLoading } = useLesson(lessonId);
  // Edits from the other device arrive as they happen.
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });
  useTableSync('lang_exercises', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });
  const { data: units } = useUnits(lesson?.courseId);

  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const duplicateBlock = useDuplicateBlock();
  const reorder = useReorderBlocks();
  const reorderExercises = useReorderExercises();
  const updateLesson = useUpdateLesson();
  const deleteExercise = useDeleteExercise();
  const duplicateExercise = useDuplicateExercise();
  const restoreBlock = useRestoreBlock();
  const restoreExercise = useRestoreExercise();
  const duplicateLesson = useDuplicateLesson();
  const createHomework = useCreateHomework();
  const { native } = useLanguages();
  const today = useToday();

  // The two languages this lesson can be EXPLAINED in - everything except the
  // one it teaches. A Russian lesson offers Español and English; a Spanish one
  // offers Русский and English. On a desk both boxes are on screen at once;
  // on a phone a switch at the top of the page picks which one.
  const langs = supportLangs(lesson?.targetLang ?? 'ru', native);
  const [chosen, setSupport] = useState<Lang>(native);
  const support = langs.includes(chosen) ? chosen : langs[0];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [wordsFor, setWordsFor] = useState<Block | null>(null);
  const [attachFor, setAttachFor] = useState<Block | null>(null);
  /** Where the insert menu will put its block: after this index, or at the end. */
  const [insertAt, setInsertAt] = useState<number | null>(null);

  // The order on screen the moment a drag ends - until the server confirms.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  useEffect(() => setLocalOrder(null), [lesson?.blocks]);
  const blocks = useMemo(() => {
    const list = lesson?.blocks ?? [];
    if (!localOrder) return list;
    const at = new Map(localOrder.map((id, i) => [id, i]));
    return [...list].sort(
      (a, b) => (at.get(a.id) ?? list.length) - (at.get(b.id) ?? list.length)
    );
  }, [lesson?.blocks, localOrder]);

  // "Saved, just now" - what the header says about the page.
  const saving =
    updateBlock.isPending ||
    createBlock.isPending ||
    deleteBlock.isPending ||
    reorder.isPending;
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !saving) setSavedAt(Date.now());
    wasSaving.current = saving;
  }, [saving]);

  const status = lesson
    ? lesson.status === 'published'
      ? 'He has it'
      : 'Draft'
    : '';
  const saved = saving ? 'saving' : savedAt ? 'saved just now' : null;
  useScreenChrome(
    {
      title: lesson?.title ?? 'Lesson',
      subtitle: [status, saved].filter(Boolean).join(', ') || undefined,
      stage: 'house',
      action: !desk ? (
        <TopBarPill
          label="Lesson settings"
          onClick={() => setSettingsOpen(true)}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
        >
          Settings
        </TopBarPill>
      ) : null,
    },
    [lesson?.title, status, saved, desk]
  );

  if (isLoading) return <ListSkeleton rows={6} header={false} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  /** The attachment a media block points at, if it has one. */
  const mediaFor = (block: Block) => {
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  const allWords = Object.values(lesson.vocabByBlock).flat();
  const unit = units?.find((u) => u.id === lesson.unit_id);
  const lessonCount = unit?.lessons.length ?? 0;

  /**
   * A block where she pointed.
   *
   * The create only knows a position; the order of the page is a separate
   * write, so the new id is spliced in and the whole order sent once.
   */
  const insert = async (kind: InsertKind, after: number | null) => {
    const at = after === null ? blocks.length : after + 1;
    if (kind === 'question') {
      setEditing({
        exercise: null,
        blockId: after === null ? null : (blocks[after]?.id ?? null),
      });
      return;
    }
    const id = await createBlock.mutateAsync({
      lessonId: lesson.id,
      kind,
      position: at,
    });
    if (at < blocks.length) {
      const ids = blocks.map((b) => b.id);
      ids.splice(at, 0, id);
      setLocalOrder(ids);
      reorder.mutate({ lessonId: lesson.id, ids });
    }
  };

  const removeExercise = (ex: Exercise) =>
    deleteExercise.mutate(
      { id: ex.id, lessonId: lesson.id },
      {
        onSuccess: () =>
          toast.success('Question removed', {
            key: 'question-removed',
            action: {
              label: 'Undo',
              onClick: () =>
                restoreExercise.mutate({ exercise: ex, lessonId: lesson.id }),
            },
          }),
      }
    );

  /** The questions of one place - a block's, or the end's - in an order she can change. */
  const questionList = (exs: Exercise[]) =>
    exs.length ? (
      <SortableList
        items={exs}
        keyOf={(e) => e.id}
        disabled={reorderExercises.isPending}
        className="space-y-2.5"
        onReorder={(next) =>
          reorderExercises.mutate({
            lessonId: lesson.id,
            ids: next.map((e) => e.id),
          })
        }
      >
        {(ex, _i, handle) => (
          <QuestionCard
            exercise={ex}
            support={support}
            target={lesson.targetLang}
            handle={handle}
            onEdit={() => setEditing({ exercise: ex, blockId: ex.block_id })}
            onDuplicate={() =>
              duplicateExercise.mutate({
                exercise: ex,
                lessonId: lesson.id,
                position: lesson.exercises.length,
              })
            }
            onDelete={() => removeExercise(ex)}
          />
        )}
      </SortableList>
    ) : null;

  const savePatch = (
    patch: Parameters<typeof updateLesson.mutate>[0] extends infer T
      ? Omit<T, 'id' | 'courseId' | 'wasPublished'>
      : never
  ) =>
    updateLesson.mutate({
      id: lesson.id,
      // So the course list learns the new title and status too.
      courseId: lesson.courseId,
      wasPublished: lesson.status === 'published',
      ...patch,
    });

  const tools = (
    <div className="space-y-1.5">
      <ToolRow
        icon={<Wand2 className="h-4 w-4" />}
        label="Homework from its words"
        note={allWords.length ? `${allWords.length} words` : 'no words yet'}
        disabled={!allWords.length || createHomework.isPending}
        onClick={() => {
          const specs = homeworkFrom(allWords, {
            support,
            target: lesson.targetLang,
          });
          if (!specs.length) {
            toast.info('These words need a meaning first');
            return;
          }
          createHomework.mutate(
            {
              courseId: lesson.courseId,
              unitId: lesson.unit_id,
              title: `${lesson.title}, homework`,
              position: lessonCount,
              support,
              specs,
            },
            {
              onSuccess: (id) => {
                toast.success(`${specs.length} questions, as a draft`);
                navigate(`/language/build/${id}`);
              },
            }
          );
        }}
      />
      <ToolRow
        icon={<Copy className="h-4 w-4" />}
        label="Duplicate lesson"
        disabled={duplicateLesson.isPending}
        onClick={() =>
          duplicateLesson.mutate(
            { lesson, position: lessonCount },
            {
              onSuccess: (id) => {
                toast.success('A copy, as a draft');
                navigate(`/language/build/${id}`);
              },
            }
          )
        }
      />
      <ToolRow
        icon={<Eye className="h-4 w-4" />}
        label="Preview as him"
        to={`/language/lesson/${lesson.id}`}
      />
      <ToolRow
        icon={<Presentation className="h-4 w-4" />}
        label="Teach it live"
        to={`/language/teach/${lesson.id}`}
      />
      <ToolRow
        icon={<SlidersHorizontal className="h-4 w-4" />}
        label="Name, kind, a line under it"
        onClick={() => setSettingsOpen(true)}
      />
    </div>
  );

  /** The desk's right pane: publish, insert, tools. */
  const inspector = (
    <div className="space-y-4">
      <PublishCard lesson={lesson} onSave={savePatch} />
      <div>
        <SectionLabel as="p">Insert</SectionLabel>
        <InsertGrid
          busy={createBlock.isPending}
          onPick={(k) => void insert(k, null)}
        />
      </div>
      <div>
        <SectionLabel as="p">Tools</SectionLabel>
        {tools}
      </div>
    </div>
  );

  const empty = blocks.length === 0 && lesson.exercises.length === 0;

  return (
    <Desk
      rail={
        <LessonTree
          courseId={lesson.courseId}
          currentId={lesson.id}
          mode="build"
        />
      }
      inspector={inspector}
      inspectorOnPhone="hidden"
    >
      <div className={cn('curtain-reveal space-y-2.5', !desk && 'pb-20')}>
        {/* The state is also the way to change it: handing a lesson over is
            the thing she does most. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'lift-press shrink-0 rounded-full border px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.08em] outline-none focus-visible:ring-2 focus-visible:ring-gold',
              lesson.status === 'published'
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-fg/10 bg-surface-2 text-muted'
            )}
          >
            {lesson.status === 'published' ? 'He has it' : 'Draft'}
          </button>
          <span className="hidden font-sans text-xs font-medium text-muted md:inline">
            {kindLabel(lesson.kind)}
            {lesson.due_on ? `, due ${dueLabel(lesson.due_on, today)}` : ''}
          </span>
          <span className="flex-1" />
          {!desk && langs.length > 1 && (
            <Segmented
              shape="bar"
              value={support}
              onChange={(v) => setSupport(v as Lang)}
              label="Explained in"
              options={langs.map((l) => ({
                value: l,
                label: LANG_NATIVE_LABELS[l],
              }))}
              className="[&>button]:py-1.5 [&>button]:text-xs"
            />
          )}
        </div>

        {empty && (
          <Empty
            icon="✍️"
            title="An empty page"
            hint="Add a paragraph, then something to try."
            action={
              <Button size="sm" onClick={() => setInsertAt(-1)}>
                <Plus className="h-4 w-4" /> First block
              </Button>
            }
          />
        )}

        <SortableList
          items={blocks}
          keyOf={(b) => b.id}
          disabled={reorder.isPending}
          className="space-y-2.5"
          onReorder={(next) => {
            const ids = next.map((b) => b.id);
            setLocalOrder(ids);
            reorder.mutate({ lessonId: lesson.id, ids });
          }}
        >
          {(block, i, handle) => (
            <div className="space-y-2.5">
              <BlockEditor
                block={block}
                supports={langs}
                visible={support}
                desk={desk}
                target={lesson.targetLang}
                handle={handle}
                onSave={(patch) =>
                  updateBlock.mutate({
                    id: block.id,
                    lessonId: lesson.id,
                    patch,
                  })
                }
                words={lesson.vocabByBlock[block.id]}
                media={mediaFor(block)}
                onDuplicate={() =>
                  duplicateBlock.mutate({
                    block,
                    vocabIds: (lesson.vocabByBlock[block.id] ?? []).map(
                      (w) => w.id
                    ),
                    lessonId: lesson.id,
                    order: blocks.map((b) => b.id),
                  })
                }
                onDelete={() => {
                  // Gone from the page at once - and back in one tap for the
                  // next nine seconds, words and all.
                  const words = (lesson.vocabByBlock[block.id] ?? []).map(
                    (w) => w.id
                  );
                  deleteBlock.mutate(
                    { id: block.id, lessonId: lesson.id },
                    {
                      onSuccess: () =>
                        toast.success('Block removed', {
                          key: 'block-removed',
                          action: {
                            label: 'Undo',
                            onClick: () =>
                              restoreBlock.mutate({
                                block,
                                vocabIds: words,
                                lessonId: lesson.id,
                              }),
                          },
                        }),
                    }
                  );
                }}
                onPickWords={() => setWordsFor(block)}
                onAttach={() => setAttachFor(block)}
                onSaveData={(data) =>
                  updateBlock.mutate({
                    id: block.id,
                    lessonId: lesson.id,
                    patch: { data: data as unknown as Json },
                  })
                }
              />
              {/* Try it here: the questions that belong to this block. */}
              {questionList(lesson.exercisesByBlock[block.id] ?? [])}
              <InsertHere onClick={() => setInsertAt(i)} />
            </div>
          )}
        </SortableList>

        {lesson.looseExercises.length > 0 && (
          <div className="space-y-2.5">
            <SectionLabel as="p">At the end</SectionLabel>
            {questionList(lesson.looseExercises)}
          </div>
        )}

        {!desk && !empty && (
          <StickyFooter>
            <Button full onClick={() => setInsertAt(-1)}>
              <Plus className="h-4 w-4" /> Insert
            </Button>
          </StickyFooter>
        )}

        {!desk && (
          <div className="space-y-4 pt-2">
            <PublishCard lesson={lesson} onSave={savePatch} />
            <div>
              <SectionLabel as="p">Tools</SectionLabel>
              {tools}
            </div>
          </div>
        )}

        <InsertMenu
          open={insertAt !== null}
          onClose={() => setInsertAt(null)}
          busy={createBlock.isPending}
          onPick={(k) => {
            const at = insertAt;
            setInsertAt(null);
            void insert(k, at === null || at < 0 ? null : at);
          }}
        />

        {/* Mounted only while open, so it always starts from the lesson as it
          is now - an edit abandoned with the X used to sit in the sheet and go
          out with the next publish. */}
        {settingsOpen && (
          <LessonSettingsSheet
            open
            onClose={() => setSettingsOpen(false)}
            lesson={lesson}
            onSave={savePatch}
            full={!desk}
          />
        )}

        {wordsFor && (
          <VocabPickerSheet
            open
            blockId={wordsFor.id}
            lessonId={lesson.id}
            selected={lesson.vocabByBlock[wordsFor.id] ?? []}
            target={lesson.targetLang}
            onClose={() => setWordsFor(null)}
          />
        )}

        {attachFor && (
          <MediaBlockEditor
            open
            courseId={lesson.courseId}
            lessonId={lesson.id}
            current={mediaFor(attachFor)}
            onClose={() => setAttachFor(null)}
            onAttached={(mediaId) =>
              updateBlock.mutate({
                id: attachFor.id,
                lessonId: lesson.id,
                patch: { data: { mediaId } },
              })
            }
            onDetach={() =>
              updateBlock.mutate({
                id: attachFor.id,
                lessonId: lesson.id,
                patch: { data: {} },
              })
            }
          />
        )}

        {editing && (
          <ExerciseEditor
            open
            lessonId={lesson.id}
            position={lesson.exercises.length}
            exercise={editing.exercise}
            blockId={editing.blockId}
            target={lesson.targetLang}
            after={
              editing.blockId
                ? `after the ${BLOCK_NAME[(blocks.find((b) => b.id === editing.blockId)?.kind ?? 'text') as BlockKind]} block`
                : undefined
            }
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </Desk>
  );
}

/** One row of the Tools list: an icon, a name, a note on the right. */
function ToolRow({
  icon,
  label,
  note,
  to,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const look =
    'lift-press flex min-h-[44px] w-full items-center gap-2.5 rounded border border-fg/[0.06] bg-surface-2 px-3 py-2 text-left font-sans text-[13px] font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50';
  const body = (
    <>
      <span className="text-gold">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {note && (
        <span className="shrink-0 font-sans text-[11px] font-semibold text-muted">
          {note}
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={look}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={look}
    >
      {body}
    </button>
  );
}
