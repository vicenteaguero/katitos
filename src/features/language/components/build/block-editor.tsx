import { useEffect, useRef, useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  DragHandle,
  Input,
  ROW_TOOL,
  RowToolbar,
  Textarea,
  type DragHandleProps,
} from '@kernel/ui';
import { isMissing } from '../../lib/pick';
import { formatTable, parseTable } from '../../lib/table-block';
import { BlockCard } from '../kit';
import {
  LANG_NATIVE_LABELS,
  type Block,
  type Lang,
  type Media,
  type TableBlockData,
  type Vocab,
} from '../../types';

/** "Write it here" - in the language of the box. */
const PROSE_PLACEHOLDER: Record<Lang, string> = {
  ru: 'По-русски…',
  es: 'En español…',
  en: 'In English…',
};

/** The column a language's prose belongs in - all three exist, none is special. */
function bodyPatch(lang: Lang, text: string) {
  const value = text || null;
  if (lang === 'ru') return { body_ru: value };
  if (lang === 'es') return { body_es: value };
  return { body_en: value };
}

/** How long after the last keystroke a box saves itself. */
const AUTOSAVE_MS = 700;

/**
 * One box that saves itself.
 *
 * Every keystroke is kept locally; a short pause after the last one - or
 * leaving the box - writes it. A change that arrives from the other device
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
    // Only when the row itself changes - not on every render.
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
 * language it can be explained in - both on a desk, the chosen one on a
 * phone. Each box reads and writes ITS OWN column: "Russian on top, English
 * or Spanish under" was hardwired, so a Spanish course filed its Spanish as
 * Russian and her Russian explanations as English. A box still empty in a
 * language is drawn dashed, so the gap shows before he finds it.
 */
export function BlockEditor({
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
  /** The language the lesson teaches - the top box. */
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
    <RowToolbar onDelete={onDelete} reveal>
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
    return <BlockCard kind="Break" toolbar={toolbar} />;
  }

  if (block.kind === 'table') {
    return (
      <BlockCard kind="Table" toolbar={toolbar}>
        <Textarea
          tone="ink"
          serif
          value={grid.text}
          onChange={(e) => grid.onChange(e.target.value)}
          onBlur={grid.flush}
          rows={4}
          spellCheck={false}
          placeholder={', singular, plural\nnominative, стол, столы'}
          className="text-[15px]"
        />
        <Input
          tone="ink"
          value={head.text}
          onChange={(e) => head.onChange(e.target.value)}
          onBlur={head.flush}
          placeholder="What the table is (optional)"
        />
        <p className="font-sans text-[11px] font-medium text-muted">
          A grid of endings: cases, persons, plurals. The first line is the
          headings, then one row per line, commas between the columns.
        </p>
      </BlockCard>
    );
  }

  if (block.kind === 'vocab') {
    return (
      <BlockCard
        kind={words?.length ? `Words, ${words.length}` : 'Words'}
        toolbar={toolbar}
      >
        <div className="flex flex-wrap gap-1.5">
          {(words ?? []).map((w) => (
            <span
              key={w.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-display text-[15px] text-fg"
            >
              {w[target] ?? w.ru}
              <span className="font-sans text-[11px] font-medium text-muted">
                {w.en ?? w.es ?? ''}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={onPickWords}
            className="lift-press inline-flex min-h-[34px] items-center gap-1 rounded-full border border-dashed border-gold/40 px-3 py-1 font-sans text-xs font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Plus className="h-3 w-3" />
            {words?.length ? 'word' : 'No words yet, tap to choose them'}
          </button>
        </div>
      </BlockCard>
    );
  }

  if (block.kind === 'media') {
    return (
      <BlockCard kind="Material" toolbar={toolbar}>
        <button
          type="button"
          onClick={onAttach}
          className={cn(
            'block min-h-[44px] w-full truncate rounded border px-3.5 py-2.5 text-left font-sans text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold',
            media
              ? 'border-fg/[0.12] bg-black/[0.28] text-fg'
              : 'border-dashed border-gold/35 bg-black/[0.18] text-muted'
          )}
        >
          {media?.title ?? 'Nothing attached yet, tap to add a file or a link'}
        </button>
      </BlockCard>
    );
  }

  return (
    <BlockCard
      kind="Text"
      missing={isMissing(block, 'body', visible)}
      toolbar={toolbar}
    >
      <Textarea
        tone="ink"
        serif
        value={head.text}
        onChange={(e) => head.onChange(e.target.value)}
        onBlur={head.flush}
        rows={2}
        lang={target}
        placeholder={PROSE_PLACEHOLDER[target]}
      />
      <div
        className={cn(
          'grid gap-2',
          desk && supports.length > 1 && 'md:grid-cols-2'
        )}
      >
        {supports.map((lang, k) =>
          shown.includes(lang) ? (
            <div key={lang} className="space-y-1">
              {desk && (
                <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  {LANG_NATIVE_LABELS[lang]}
                </p>
              )}
              <Textarea
                tone="ink"
                value={glosses[k].text}
                onChange={(e) => glosses[k].onChange(e.target.value)}
                onBlur={glosses[k].flush}
                rows={2}
                lang={lang}
                placeholder={
                  glosses[k].text
                    ? PROSE_PLACEHOLDER[lang]
                    : 'Still untranslated, tap to add'
                }
                className={cn(
                  'text-sm',
                  !glosses[k].text &&
                    'border-dashed border-gold/35 bg-black/[0.18] placeholder:text-muted/50'
                )}
              />
            </div>
          ) : null
        )}
      </div>
    </BlockCard>
  );
}
