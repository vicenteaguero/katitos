import { useState } from 'react';
import { useParams } from 'react-router';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Send,
  SlidersHorizontal,
  Trash2,
  Type,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Input,
  LoadingScreen,
  Segmented,
  Sheet,
  Textarea,
  toast,
  useTopBarAction,
  useWideLayout,
} from '@kernel/ui';
import { useLesson } from '../api/lessons.queries';
import {
  useCreateBlock,
  useDeleteBlock,
  useDeleteExercise,
  useReorderBlocks,
  useRestoreBlock,
  useRestoreExercise,
  useUpdateBlock,
  useUpdateLesson,
} from '../api/lessons.mutations';
import { supportLangs, useLanguages } from '../lib/languages';
import { isMissing, pick } from '../lib/pick';
import { formatTable, parseTable } from '../lib/table-block';
import { ExerciseEditor } from '../components/exercises/exercise-editor';
import { MediaBlockEditor } from '../components/media-block-editor';
import { VocabPickerSheet } from '../components/vocab-picker-sheet';
import type { Json } from '@kernel/supabase';
import type {
  Block,
  BlockKind,
  Exercise,
  LessonKind,
  Media,
  MediaBlockData,
  Lang,
  TableBlockData,
  Vocab,
} from '../types';
import { LANG_NATIVE_LABELS } from '../types';

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

/**
 * Where she builds the lesson.
 *
 * This is the screen that has to work on a tablet — she plans on a big screen
 * and teaches from her phone — so it asks for the wide canvas. On a phone
 * nothing changes; from `md:` up it simply stops being a 32rem column.
 */
export function BuildRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  useWideLayout();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const reorder = useReorderBlocks();
  const updateLesson = useUpdateLesson();
  const deleteExercise = useDeleteExercise();
  const restoreBlock = useRestoreBlock();
  const restoreExercise = useRestoreExercise();
  const { native } = useLanguages();
  // The two languages this lesson can be EXPLAINED in — everything except the
  // one it teaches. A Russian lesson offers Español and English; a Spanish one
  // offers Русский and English. It used to offer EN / ES to both, which meant
  // she could never write a word of Russian explanation for the Spanish she
  // teaches him — the one language she actually thinks in.
  const langs = supportLangs(lesson?.targetLang ?? 'ru', native);
  const [chosen, setSupport] = useState<Lang>(native);
  const support = langs.includes(chosen) ? chosen : langs[0];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [wordsFor, setWordsFor] = useState<Block | null>(null);
  const [attachFor, setAttachFor] = useState<Block | null>(null);

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <Segmented
        value={support}
        onChange={(v) => setSupport(v as Lang)}
        options={langs.map((l) => ({
          value: l,
          label: LANG_NATIVE_LABELS[l],
        }))}
      />
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Lesson settings"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-gold shadow-loge"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>,
    [support]
  );

  if (isLoading) return <LoadingScreen />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const blocks = lesson.blocks;

  /** The attachment a media block points at, if it has one. */
  const mediaFor = (block: Block) => {
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...blocks];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ lessonId: lesson.id, ids: next.map((b) => b.id) });
  };

  return (
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

      <div className="lg:flex lg:items-start lg:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {blocks.length === 0 && lesson.exercises.length === 0 && (
            <Empty
              icon="✍️"
              title="An empty page"
              hint="Add a paragraph, then something to try."
            />
          )}

          {blocks.map((block, i) => (
            <BlockEditor
              // The support language is part of the identity: the editor seeds
              // its gloss from it, so without this a switch left English in the
              // box and wrote it into `body_es` on the next blur.
              key={`${block.id}:${support}`}
              block={block}
              support={support}
              target={lesson.targetLang}
              first={i === 0}
              last={i === blocks.length - 1}
              onMove={(by) => move(i, by)}
              onSave={(patch) =>
                updateBlock.mutate({ id: block.id, lessonId: lesson.id, patch })
              }
              words={lesson.vocabByBlock[block.id]}
              media={mediaFor(block)}
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
          ))}

          {lesson.exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-[0.68rem] uppercase tracking-[0.12em] text-gold">
                  {ex.kind}
                </span>
                <span className="block truncate font-sans text-sm text-fg">
                  {pick(ex, 'prompt', support) || 'Untitled question'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing(ex)}
                className="shrink-0 font-sans text-xs text-gold"
              >
                edit
              </button>
              <button
                type="button"
                aria-label="Delete question"
                onClick={() =>
                  deleteExercise.mutate(
                    { id: ex.id, lessonId: lesson.id },
                    {
                      onSuccess: () =>
                        toast.success('Question removed', {
                          key: 'question-removed',
                          action: {
                            label: 'Undo',
                            onClick: () =>
                              restoreExercise.mutate({
                                exercise: ex,
                                lessonId: lesson.id,
                              }),
                          },
                        }),
                    }
                  )
                }
                className="shrink-0 text-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 shrink-0 lg:mt-0 lg:w-64">
          <div className="flex flex-wrap gap-1.5">
            {(
              ['text', 'vocab', 'table', 'media', 'divider'] as BlockKind[]
            ).map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant="secondary"
                onClick={() =>
                  createBlock.mutate({
                    lessonId: lesson.id,
                    kind,
                    position: blocks.length,
                  })
                }
              >
                <Plus size={13} /> {kind}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing('new')}
            >
              <Type size={13} /> question
            </Button>
          </div>
        </div>
      </div>

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
          exercise={editing === 'new' ? null : editing}
          target={lesson.targetLang}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/**
 * A block, in every language at once.
 *
 * The Russian and the explanation sit in the same card, with the support
 * language switchable in the top bar — so turning a Russian/English lesson into
 * a Russian/Spanish one is filling in a blank, never rewriting a lesson.
 */
function BlockEditor({
  block,
  support,
  target,
  first,
  last,
  words,
  media,
  onMove,
  onSave,
  onDelete,
  onPickWords,
  onAttach,
  onSaveData,
}: {
  block: Block;
  support: Lang;
  /** The language the lesson teaches — the top box. */
  target: Lang;
  first: boolean;
  last: boolean;
  /** What this block currently holds, so the row can say so. */
  words?: Vocab[];
  media?: Media;
  onMove: (by: -1 | 1) => void;
  onSave: (patch: {
    body_ru?: string | null;
    body_en?: string | null;
    body_es?: string | null;
  }) => void;
  onDelete: () => void;
  onPickWords: () => void;
  onAttach: () => void;
  onSaveData: (data: TableBlockData) => void;
}) {
  // The language being taught on top, the explanation under it — each box
  // reads and writes ITS OWN column. "Russian on top, English or Spanish
  // under" was hardwired, so a Spanish course filed its Spanish as Russian
  // and her Russian explanations as English.
  const [head, setHead] = useState(block[`body_${target}`] ?? '');
  const [gloss, setGloss] = useState(block[`body_${support}`] ?? '');
  const [grid, setGrid] = useState(() =>
    formatTable((block.data ?? {}) as TableBlockData, support)
  );

  if (block.kind === 'divider') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
        <Minus className="h-4 w-4 text-muted" />
        <span className="flex-1 font-sans text-xs text-muted">A break</span>
        <button type="button" onClick={onDelete} className="text-muted">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const missing = isMissing(block, 'body', support);

  if (block.kind === 'table') {
    return (
      <div className="space-y-1.5 rounded-lg bg-surface px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 font-sans text-[0.68rem] uppercase tracking-[0.12em] text-gold">
            table
          </span>
          <button
            type="button"
            aria-label="Move up"
            disabled={first}
            onClick={() => onMove(-1)}
            className={cn('text-muted', first && 'opacity-30')}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
            className={cn('text-muted', last && 'opacity-30')}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={onDelete}
            className="text-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <Textarea
          value={grid}
          onChange={(e) => setGrid(e.target.value)}
          onBlur={() =>
            onSaveData(
              parseTable(grid, support, (block.data ?? {}) as TableBlockData)
            )
          }
          rows={4}
          spellCheck={false}
          placeholder={', singular, plural\nnominative, стол, столы'}
          className="font-display"
        />
        <Input
          value={head}
          onChange={(e) => setHead(e.target.value)}
          onBlur={() => onSave(bodyPatch(target, head))}
          placeholder="What the table is (optional)"
        />
      </div>
    );
  }

  if (block.kind === 'vocab' || block.kind === 'media') {
    const isVocab = block.kind === 'vocab';
    const summary = isVocab
      ? words?.length
        ? words.map((w) => w.ru).join(' · ')
        : 'No words yet — tap to choose them'
      : (media?.title ?? 'Nothing attached yet — tap to add a file or a link');
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
        <button
          type="button"
          onClick={isVocab ? onPickWords : onAttach}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block font-sans text-[0.68rem] uppercase tracking-[0.12em] text-gold">
            {isVocab ? 'words' : 'material'}
          </span>
          <span
            className={cn(
              'block truncate font-sans text-sm',
              (isVocab ? words?.length : media) ? 'text-fg' : 'text-muted'
            )}
          >
            {summary}
          </span>
        </button>
        <button
          type="button"
          aria-label="Move up"
          disabled={first}
          onClick={() => onMove(-1)}
          className={cn('text-muted', first && 'opacity-30')}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={last}
          onClick={() => onMove(1)}
          className={cn('text-muted', last && 'opacity-30')}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={onDelete}
          className="text-muted"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-sans text-[0.68rem] uppercase tracking-[0.12em] text-gold">
          {block.kind}
        </span>
        {missing && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-copper"
            title="No translation yet"
          />
        )}
        <button
          type="button"
          aria-label="Move up"
          disabled={first}
          onClick={() => onMove(-1)}
          className={cn('text-muted', first && 'opacity-30')}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={last}
          onClick={() => onMove(1)}
          className={cn('text-muted', last && 'opacity-30')}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={onDelete}
          className="text-muted"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Textarea
        value={head}
        onChange={(e) => setHead(e.target.value)}
        onBlur={() => onSave(bodyPatch(target, head))}
        rows={2}
        placeholder={PROSE_PLACEHOLDER[target]}
        className="font-display"
      />
      <Textarea
        value={gloss}
        onChange={(e) => setGloss(e.target.value)}
        onBlur={() => onSave(bodyPatch(support, gloss))}
        rows={2}
        placeholder={PROSE_PLACEHOLDER[support]}
      />
    </div>
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
  };
  onSave: (patch: {
    title?: string;
    subtitle?: string | null;
    kind?: LessonKind;
    status?: 'draft' | 'published';
    dueOn?: string | null;
  }) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [subtitle, setSubtitle] = useState(lesson.subtitle ?? '');
  const [kind, setKind] = useState(lesson.kind as LessonKind);
  const [dueOn, setDueOn] = useState(lesson.due_on ?? '');

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
    return patch;
  };

  return (
    <Sheet open={open} onClose={onClose} title="This lesson" size="half">
      <div className="space-y-3">
        <Segmented
          full
          value={kind}
          onChange={(v) => setKind(v as LessonKind)}
          options={[
            { value: 'lesson', label: 'Lesson' },
            { value: 'homework', label: 'Homework' },
            { value: 'exam', label: 'Exam' },
          ]}
        />
        <Field label="Called">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <FieldRow>
          <Field label="A line under it">
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </Field>
          <Field label="Due">
            <Input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
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
            });
            onClose();
          }}
        >
          <Send size={15} />
          {lesson.status === 'published'
            ? 'Put back to draft'
            : 'Give it to him'}
        </Button>
      </div>
    </Sheet>
  );
}
