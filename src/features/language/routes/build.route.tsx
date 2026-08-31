import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { usePartner } from '@kernel/auth';
import {
  Copy,
  Eye,
  HelpCircle,
  Pencil,
  Presentation,
  Send,
  SlidersHorizontal,
  Trash2,
  Wand2,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Checkbox,
  Desk,
  Dialog,
  DragHandle,
  Empty,
  Field,
  FieldRow,
  Input,
  Kicker,
  ListSkeleton,
  ROW_TOOL,
  RowToolbar,
  Segmented,
  SortableList,
  Textarea,
  toast,
  TopBarButton,
  useDesk,
  useIsDesk,
  useTopBarAction,
  type DragHandleProps,
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
import { isMissing, pick } from '../lib/pick';
import { formatTable, parseTable } from '../lib/table-block';
import { ExerciseEditor } from '../components/exercises/exercise-editor';
import { MediaBlockEditor } from '../components/media-block-editor';
import { LessonTree } from '../components/lesson-tree';
import { BlockCard, BlockPalette } from '../components/kit';
import { VocabPickerSheet } from '../components/vocab-picker-sheet';
import type { Json } from '@kernel/supabase';
import type {
  Block,
  Exercise,
  LessonKind,
  Media,
  MediaBlockData,
  Lang,
  TableBlockData,
  Vocab,
} from '../types';
import { LANG_NATIVE_LABELS } from '../types';
import { clockIn, isAsleep } from '../lib/quiet';

const KIND_LABEL: Record<LessonKind, string> = {
  lesson: 'Lesson',
  homework: 'Homework',
  exam: 'Exam',
};

/** "Write it here" — in the language of the box. */
const PROSE_PLACEHOLDER: Record<Lang, string> = {
  ru: 'По-русски…',
  es: 'En español…',
  en: 'In English…',
};

/** The column a language's prose belongs in — all three exist, none is special. */
function bodyPatch(lang: Lang, text: string) {
  const value = text || null;
  if (lang === 'ru') return { body_ru: value };
  if (lang === 'es') return { body_es: value };
  return { body_en: value };
}

/** How long after the last keystroke a box saves itself. */
const AUTOSAVE_MS = 700;

/** Which question the editor is open on, and where a new one goes. */
type Editing = { exercise: Exercise | null; blockId: string | null };

/**
 * Where she builds the lesson.
 *
 * On a desk: the course down the left, the page in the middle, what to add
 * and what this lesson is on the right — and every language of a block side
 * by side. On a phone the same page, one language of explanation at a time.
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

  // The two languages this lesson can be EXPLAINED in — everything except the
  // one it teaches. A Russian lesson offers Español and English; a Spanish one
  // offers Русский and English. On a desk both boxes are on screen at once;
  // on a phone the top bar picks which one.
  const langs = supportLangs(lesson?.targetLang ?? 'ru', native);
  const [chosen, setSupport] = useState<Lang>(native);
  const support = langs.includes(chosen) ? chosen : langs[0];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [wordsFor, setWordsFor] = useState<Block | null>(null);
  const [attachFor, setAttachFor] = useState<Block | null>(null);

  // The order on screen the moment a drag ends — until the server confirms.
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

  // "Saved · just now" — what the inspector says about the page.
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

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      {!desk && (
        <Segmented
          value={support}
          onChange={(v) => setSupport(v as Lang)}
          label="Explained in"
          options={langs.map((l) => ({
            value: l,
            label: LANG_NATIVE_LABELS[l],
          }))}
        />
      )}
      <TopBarButton
        label="Lesson settings"
        onClick={() => setSettingsOpen(true)}
        variant="quiet"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </TopBarButton>
    </div>,
    [support, desk]
  );

  if (isLoading) return <ListSkeleton rows={6} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  /** The attachment a media block points at, if it has one. */
  const mediaFor = (block: Block) => {
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  const allWords = Object.values(lesson.vocabByBlock).flat();
  const unit = units?.find((u) => u.id === lesson.unit_id);
  const lessonCount = unit?.lessons.length ?? 0;

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

  /** One question, where it sits in the page. */
  const exerciseRow = (ex: Exercise, handle?: DragHandleProps) => (
    <div
      key={ex.id}
      className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
    >
      {handle ? (
        <DragHandle {...handle} />
      ) : (
        <HelpCircle className="h-4 w-4 shrink-0 text-gold" />
      )}
      <button
        type="button"
        onClick={() => setEditing({ exercise: ex, blockId: ex.block_id })}
        className="min-w-0 flex-1 rounded text-left hover:bg-fg/5"
      >
        <Kicker as="span" className="block">
          {ex.kind}
          {ex.points !== 1 && (
            <span className="ml-1.5 text-muted">· {ex.points} pts</span>
          )}
        </Kicker>
        <span className="block truncate font-sans text-sm text-fg">
          {pick(ex, 'prompt', support) || 'Untitled question'}
        </span>
      </button>
      <RowToolbar
        onDelete={() => removeExercise(ex)}
        deleteLabel="Delete question"
      >
        <button
          type="button"
          aria-label="Edit question"
          onClick={() => setEditing({ exercise: ex, blockId: ex.block_id })}
          className={ROW_TOOL}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Duplicate question"
          onClick={() =>
            duplicateExercise.mutate({
              exercise: ex,
              lessonId: lesson.id,
              position: lesson.exercises.length,
            })
          }
          className={ROW_TOOL}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </RowToolbar>
    </div>
  );

  /** The questions of one place — a block's, or the end's — in an order she can change. */
  const questionList = (exs: Exercise[]) =>
    exs.length ? (
      <SortableList
        items={exs}
        keyOf={(e) => e.id}
        disabled={reorderExercises.isPending}
        className="space-y-1.5"
        onReorder={(next) =>
          reorderExercises.mutate({
            lessonId: lesson.id,
            ids: next.map((e) => e.id),
          })
        }
      >
        {(ex, _i, handle) => exerciseRow(ex, handle)}
      </SortableList>
    ) : null;

  /** The desk's right pane: what to add, what this lesson is, what to do with it. */
  const inspector = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Kicker as="p">Add</Kicker>
        <BlockPalette
          busy={createBlock.isPending}
          onAdd={(kind) =>
            createBlock.mutate({
              lessonId: lesson.id,
              kind,
              position: blocks.length,
            })
          }
          onQuestion={() => setEditing({ exercise: null, blockId: null })}
        />
      </div>
      <div className="space-y-1.5 rounded-lg bg-surface px-3 py-2.5">
        <Kicker as="p">This lesson</Kicker>
        <p className="font-sans text-sm text-fg">
          {KIND_LABEL[lesson.kind as LessonKind] ?? lesson.kind}
          {lesson.due_on ? ` · due ${lesson.due_on}` : ''}
          {lesson.est_minutes ? ` · ${lesson.est_minutes} min` : ''}
        </p>
        <p className="font-sans text-xs text-muted">
          {lesson.status === 'published' ? 'He has it.' : 'Not sent yet.'}
          {' · '}
          {saving ? 'Saving…' : savedAt ? 'Saved' : 'Every box saves itself'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => setSettingsOpen(true)}
          >
            <SlidersHorizontal size={13} /> Settings
          </Button>
          <Link to={`/language/lesson/${lesson.id}`}>
            <Button size="xs" variant="secondary">
              <Eye size={13} /> Preview
            </Button>
          </Link>
          <Link to={`/language/teach/${lesson.id}`}>
            <Button size="xs" variant="secondary">
              <Presentation size={13} /> Teach it
            </Button>
          </Link>
        </div>
      </div>
      <div className="space-y-1.5">
        <Kicker as="p">Make</Kicker>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="xs"
            variant="secondary"
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
          >
            <Copy size={13} /> A copy of this lesson
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={!allWords.length || createHomework.isPending}
            title={
              allWords.length
                ? `From the ${allWords.length} words in this lesson`
                : 'Put some words in the lesson first'
            }
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
                  title: `${lesson.title} — homework`,
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
          >
            <Wand2 size={13} /> Homework from its words
          </Button>
        </div>
      </div>
    </div>
  );

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
    >
      <div className="curtain-reveal space-y-3">
        <header className="flex items-baseline justify-between gap-2">
          <h1 className="min-w-0 truncate font-display text-xl font-semibold text-fg">
            {lesson.title}
          </h1>
          {/* The state is also the way to change it: handing a lesson over is the
            thing she does most, and it was two taps deep behind an icon. */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'lift-press shrink-0 rounded-full px-2.5 py-1 font-sans text-[0.68rem] uppercase tracking-[0.12em]',
              lesson.status === 'published'
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-muted'
            )}
          >
            {lesson.status === 'published' ? 'he has it' : 'not sent yet'}
          </button>
        </header>

        {blocks.length === 0 && lesson.exercises.length === 0 && (
          <Empty
            icon="✍️"
            title="An empty page"
            hint="Add a paragraph, then something to try."
          />
        )}

        <SortableList
          items={blocks}
          keyOf={(b) => b.id}
          disabled={reorder.isPending}
          onReorder={(next) => {
            const ids = next.map((b) => b.id);
            setLocalOrder(ids);
            reorder.mutate({ lessonId: lesson.id, ids });
          }}
        >
          {(block, _i, handle) => (
            <div className="space-y-1.5">
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
                  // Gone from the page at once — and back in one tap for the
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
              <button
                type="button"
                onClick={() =>
                  setEditing({ exercise: null, blockId: block.id })
                }
                className="flex items-center gap-1.5 rounded px-2 py-0.5 font-sans text-xs text-muted hover:bg-fg/5 hover:text-fg"
              >
                <HelpCircle className="h-3.5 w-3.5" /> a question here
              </button>
            </div>
          )}
        </SortableList>

        {lesson.looseExercises.length > 0 && (
          <div className="space-y-1.5">
            <Kicker as="p" tone="muted">
              At the end
            </Kicker>
            {questionList(lesson.looseExercises)}
          </div>
        )}

        {/* Mounted only while open, so it always starts from the lesson as it
          is now — an edit abandoned with the X used to sit in the sheet and go
          out with the next publish. */}
        {settingsOpen && (
          <LessonSettingsSheet
            open
            onClose={() => setSettingsOpen(false)}
            lesson={lesson}
            onSave={(patch) =>
              updateLesson.mutate({
                id: lesson.id,
                // So the course list learns the new title and status too.
                courseId: lesson.courseId,
                wasPublished: lesson.status === 'published',
                ...patch,
              })
            }
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
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </Desk>
  );
}

/**
 * One box that saves itself.
 *
 * Every keystroke is kept locally; a short pause after the last one — or
 * leaving the box — writes it. A change that arrives from the other device
 * replaces the text only while nothing here is unsaved, so last-blur-wins
 * across two devices is no longer how it works.
 */
function useAutosave(
  fromServer: string,
  save: (text: string) => void,
  serverVersion: string
) {
  const [text, setText] = useState(fromServer);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(save);
  latest.current = save;

  useEffect(() => {
    if (!dirty.current) setText(fromServer);
    // Only when the row itself changes — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverVersion]);

  const flush = () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    latest.current(text);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = (next: string) => {
    setText(next);
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!dirty.current) return;
      dirty.current = false;
      latest.current(next);
    }, AUTOSAVE_MS);
  };
  return { text, onChange, flush };
}

/**
 * A block, in every language at once.
 *
 * The language being taught on top, and under it an explanation box per
 * language it can be explained in — both on a desk, the chosen one on a
 * phone. Each box reads and writes ITS OWN column: "Russian on top, English
 * or Spanish under" was hardwired, so a Spanish course filed its Spanish as
 * Russian and her Russian explanations as English.
 */
function BlockEditor({
  block,
  supports,
  visible,
  desk,
  target,
  words,
  media,
  handle,
  onSave,
  onDelete,
  onDuplicate,
  onPickWords,
  onAttach,
  onSaveData,
}: {
  block: Block;
  /** The languages it can be explained in. */
  supports: Lang[];
  /** The one a phone shows. */
  visible: Lang;
  desk: boolean;
  /** The language the lesson teaches — the top box. */
  target: Lang;
  /** What this block currently holds, so the row can say so. */
  words?: Vocab[];
  media?: Media;
  handle: DragHandleProps;
  onSave: (patch: {
    body_ru?: string | null;
    body_en?: string | null;
    body_es?: string | null;
  }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPickWords: () => void;
  onAttach: () => void;
  onSaveData: (data: TableBlockData) => void;
}) {
  const version = block.updated_at;
  const head = useAutosave(
    block[`body_${target}`] ?? '',
    (t) => onSave(bodyPatch(target, t)),
    `${version}:${target}`
  );
  const gloss0 = useAutosave(
    block[`body_${supports[0]}`] ?? '',
    (t) => onSave(bodyPatch(supports[0], t)),
    `${version}:${supports[0]}`
  );
  const gloss1 = useAutosave(
    block[`body_${supports[1]}`] ?? '',
    (t) => onSave(bodyPatch(supports[1], t)),
    `${version}:${supports[1]}`
  );
  const grid = useAutosave(
    formatTable((block.data ?? {}) as TableBlockData, visible),
    (t) =>
      onSaveData(parseTable(t, visible, (block.data ?? {}) as TableBlockData)),
    `${version}:${visible}`
  );
  const glosses = [gloss0, gloss1];
  const shown = desk ? supports : [visible];

  const toolbar = (
    <RowToolbar onDelete={onDelete}>
      <button
        type="button"
        aria-label="Duplicate block"
        onClick={onDuplicate}
        className={ROW_TOOL}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <DragHandle {...handle} />
    </RowToolbar>
  );

  if (block.kind === 'divider') {
    return <BlockCard kind="a break" toolbar={toolbar} />;
  }

  if (block.kind === 'table') {
    return (
      <BlockCard kind="table" toolbar={toolbar}>
        <Textarea
          value={grid.text}
          onChange={(e) => grid.onChange(e.target.value)}
          onBlur={grid.flush}
          rows={4}
          spellCheck={false}
          placeholder={', singular, plural\nnominative, стол, столы'}
          className="font-display"
        />
        <p className="font-sans text-xs text-muted">
          A grid of endings — cases, persons, plurals. Type it like a list: the
          first line is the headings, then one row per line, commas between the
          columns.
        </p>
        <Input
          value={head.text}
          onChange={(e) => head.onChange(e.target.value)}
          onBlur={head.flush}
          placeholder="What the table is (optional)"
        />
      </BlockCard>
    );
  }

  if (block.kind === 'vocab' || block.kind === 'media') {
    const isVocab = block.kind === 'vocab';
    const summary = isVocab
      ? words?.length
        ? words.map((w) => w[target] ?? w.ru).join(' · ')
        : 'No words yet — tap to choose them'
      : (media?.title ?? 'Nothing attached yet — tap to add a file or a link');
    return (
      <BlockCard kind={isVocab ? 'words' : 'material'} toolbar={toolbar}>
        <button
          type="button"
          onClick={isVocab ? onPickWords : onAttach}
          className={cn(
            'block w-full truncate rounded text-left font-sans text-sm hover:bg-fg/5',
            (isVocab ? words?.length : media) ? 'text-fg' : 'text-muted'
          )}
        >
          {summary}
        </button>
      </BlockCard>
    );
  }

  return (
    <BlockCard
      kind={block.kind}
      missing={isMissing(block, 'body', visible)}
      toolbar={toolbar}
    >
      <Textarea
        value={head.text}
        onChange={(e) => head.onChange(e.target.value)}
        onBlur={head.flush}
        rows={2}
        placeholder={PROSE_PLACEHOLDER[target]}
        className="font-display"
      />
      <div
        className={cn(
          'grid gap-1.5',
          desk && supports.length > 1 && 'md:grid-cols-2'
        )}
      >
        {supports.map((lang, k) =>
          shown.includes(lang) ? (
            <div key={lang} className="space-y-0.5">
              {desk && (
                <Kicker as="p" tone="muted">
                  {LANG_NATIVE_LABELS[lang]}
                </Kicker>
              )}
              <Textarea
                value={glosses[k].text}
                onChange={(e) => glosses[k].onChange(e.target.value)}
                onBlur={glosses[k].flush}
                rows={2}
                placeholder={PROSE_PLACEHOLDER[lang]}
              />
            </div>
          ) : null
        )}
      </div>
    </BlockCard>
  );
}

function LessonSettingsSheet({
  open,
  onClose,
  lesson,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  lesson: {
    title: string;
    subtitle: string | null;
    kind: string;
    status: string;
    due_on: string | null;
    est_minutes: number | null;
  };
  onSave: (patch: {
    title?: string;
    subtitle?: string | null;
    kind?: LessonKind;
    status?: 'draft' | 'published';
    dueOn?: string | null;
    estMinutes?: number | null;
    wake?: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [subtitle, setSubtitle] = useState(lesson.subtitle ?? '');
  const [kind, setKind] = useState(lesson.kind as LessonKind);
  const [dueOn, setDueOn] = useState(lesson.due_on ?? '');
  const [minutes, setMinutes] = useState(
    lesson.est_minutes ? String(lesson.est_minutes) : ''
  );
  // His clock, next to the button that reaches his phone.
  const { partner } = usePartner();
  const asleep = isAsleep(partner?.timezone);
  const clock = clockIn(partner?.timezone);
  const [wake, setWake] = useState(false);

  /**
   * Only what she actually changed.
   *
   * Sending every field meant a rename made on the phone was overwritten by
   * whatever this device had when the sheet opened.
   */
  const changes = () => {
    const patch: Parameters<typeof onSave>[0] = {};
    if (title !== lesson.title) patch.title = title;
    if ((subtitle || null) !== (lesson.subtitle ?? null)) {
      patch.subtitle = subtitle || null;
    }
    if (kind !== lesson.kind) patch.kind = kind;
    if ((dueOn || null) !== (lesson.due_on ?? null))
      patch.dueOn = dueOn || null;
    const est = minutes ? Number(minutes) : null;
    if (est !== (lesson.est_minutes ?? null)) patch.estMinutes = est;
    return patch;
  };

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="This lesson"
      size="md"
    >
      <div className="space-y-3">
        <Segmented
          full
          value={kind}
          onChange={(v) => setKind(v as LessonKind)}
          label="Kind"
          options={[
            { value: 'lesson', label: 'Lesson' },
            { value: 'homework', label: 'Homework' },
            { value: 'exam', label: 'Exam' },
          ]}
        />
        <Field label="Called">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="A line under it">
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </Field>
        <FieldRow>
          <Field label="Due">
            <Input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
            />
          </Field>
          <Field
            label="About how long"
            hint="Minutes — so he knows what he is starting"
          >
            <Input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="20"
            />
          </Field>
        </FieldRow>
        <Button
          full
          variant="secondary"
          onClick={() => {
            const patch = changes();
            if (Object.keys(patch).length) onSave(patch);
            onClose();
          }}
        >
          Save
        </Button>
        {/* Publishing is what tells him it exists — nothing reaches his phone
            until she decides it is ready. */}
        <Button
          full
          onClick={() => {
            onSave({
              ...changes(),
              status: lesson.status === 'published' ? 'draft' : 'published',
              wake,
            });
            onClose();
          }}
        >
          <Send size={15} />
          {lesson.status === 'published'
            ? 'Put back to draft'
            : 'Give it to him'}
        </Button>
        {lesson.status !== 'published' && clock && (
          <p className="font-sans text-xs text-muted">
            It's {clock} for him
            {asleep
              ? ' — his phone stays quiet; he will find it on his home screen'
              : ''}
            .
          </p>
        )}
        {lesson.status !== 'published' && asleep && (
          <label className="flex items-center gap-2 font-sans text-xs text-fg">
            <Checkbox
              checked={wake}
              onChange={() => setWake((w) => !w)}
              label="Buzz him anyway"
            />
            Buzz him anyway
          </label>
        )}
        <p className="font-sans text-xs text-muted">
          <Trash2 className="mr-1 inline h-3 w-3" />
          To put the whole lesson away, use the course screen.
        </p>
      </div>
    </Dialog>
  );
}
