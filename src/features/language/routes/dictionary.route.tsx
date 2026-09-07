import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClipboardPaste, Mic, Plus, Tag, Trash2 } from 'lucide-react';
import { cn } from '@kernel/lib';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Card,
  Checkbox,
  Desk,
  Dialog,
  Dropzone,
  Empty,
  Field,
  Input,
  SearchInput,
  SectionLabel,
  Segmented,
  StatPill,
  StickyFooter,
  toast,
  TopBarPill,
  useDesk,
  useIsDesk,
  useScreenChrome,
} from '@kernel/ui';
import {
  useAllVocab,
  useDeleteVocab,
  useDeleteVocabMany,
  useRestoreVocab,
  useRestoreVocabMany,
  useTagVocabMany,
  useUpdateVocab,
  useVocab,
} from '../api/vocab';
import { useLanguages } from '../lib/languages';
import { VocabRow } from '../components/kit';
import { headword as headwordOf, termLangOf } from '../lib/pick';
import { matchClips } from '../lib/match-clips';
import { ImportWordsDialog } from '../components/import-words-dialog';
import { RecordQueueDialog } from '../components/record-queue-dialog';
import { WordEditor } from '../components/word-editor';
import {
  LANG_LABELS,
  LANG_NATIVE_LABELS,
  type Lang,
  type Vocab,
} from '../types';

/**
 * Every word either of us has ever been taught, and a way to add the next one.
 *
 * Two dictionaries in one, because there are two languages being learned here.
 * The switch at the top says which one you are looking at. A row carries one
 * control, her voice; everything else about a word is on its card. Select
 * mode puts a box on every row and one bar at the bottom for the lot.
 */
export function DictionaryRoute() {
  useDesk();
  const desk = useIsDesk();
  const { native, learning } = useLanguages();
  // A push about a word lands on that word: `?word=<id>&lang=ru`.
  const [params] = useSearchParams();
  const paramLang = (['ru', 'es', 'en'] as Lang[]).find(
    (l) => l === params.get('lang')
  );
  const wanted = params.get('word');
  const [lang, setLang] = useState<Lang>(paramLang ?? learning);
  useEffect(() => setLang(paramLang ?? learning), [learning, paramLang]);

  const [search, setSearch] = useState('');
  // What the QUERY sees, a beat behind the box. Typing "привет" used to fire
  // six separate `limit 500` searches and keep all six in the cache.
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: words } = useVocab(lang, term);
  // Both counts, for the switch.
  const { data: learningAll } = useAllVocab(learning);
  const { data: nativeAll } = useAllVocab(native);

  const [editing, setEditing] = useState<Vocab | 'new' | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useScreenChrome(
    {
      title: 'Dictionary',
      stage: 'house',
      action: (
        <TopBarPill
          label={selecting ? 'Done selecting' : 'Select words'}
          tone={selecting ? 'accent' : 'quiet'}
          onClick={() => {
            setSelecting((v) => !v);
            setSelected(new Set());
          }}
        >
          {selecting ? 'Done' : 'Select'}
        </TopBarPill>
      ),
    },
    [selecting]
  );

  const list = useMemo(() => words ?? [], [words]);
  // Once: the list refetches, and the sheet must not reopen after she closes it.
  const landed = useRef(false);
  useEffect(() => {
    if (!wanted || landed.current) return;
    const w = list.find((x) => x.id === wanted);
    if (w) {
      landed.current = true;
      setEditing(w);
    }
  }, [wanted, list]);
  const del = useDeleteVocab();
  const restore = useRestoreVocab();
  const delMany = useDeleteVocabMany();
  const restoreMany = useRestoreVocabMany();
  const tagMany = useTagVocabMany();
  const update = useUpdateVocab();

  // Every tag on screen, as chips; tap one to narrow the list to it.
  const [tag, setTag] = useState<string | null>(null);
  const [silentOnly, setSilentOnly] = useState(false);
  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of list)
      for (const t of w.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [list]);
  const silent = list.filter((w) => !w.audio_path).length;
  const shown = list.filter(
    (w) =>
      (!tag || (w.tags ?? []).includes(tag)) && (!silentOnly || !w.audio_path)
  );

  // Many at once: a box on every row, and one bar that acts on the lot.
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosen = shown.filter((w) => selected.has(w.id));
  const [bulkTag, setBulkTag] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  /** The words the recording queue should offer; null closed. */
  const [queue, setQueue] = useState<Vocab[] | null>(null);
  // Her voice belongs on the words of her language.
  const canRecord = lang === native;

  // ONE signing request for every recording on the screen, rather than one per
  // word - this list can be five hundred long.
  const { data: clips } = useSignedUrls(
    BUCKETS.languageAudio,
    list.map((w) => w.audio_path),
    { proxy: false }
  );

  /** A folder of clips dropped on the list: each to the word it is named after. */
  const dropClips = async (files: File[]) => {
    const matches = matchClips(files, list);
    const hits = matches.filter((m) => m.word);
    if (!hits.length) {
      toast.error('No file was named after a word here');
      return;
    }
    for (const { file, word } of hits) {
      const ext = file.name.includes('.')
        ? file.name.split('.').pop()!.toLowerCase()
        : 'webm';
      await update.mutateAsync({
        id: word!.id,
        patch: {},
        audio: {
          blob: file,
          mime: file.type || 'audio/webm',
          ext,
          durationMs: 0,
        },
        previousAudioPath: word!.audio_path,
      });
    }
    const missed = matches.length - hits.length;
    toast.success(
      `${hits.length} ${hits.length === 1 ? 'recording' : 'recordings'} attached${
        missed ? `, ${missed} not named after a word` : ''
      }`
    );
  };

  // Put away, not destroyed - and back in one tap. A real delete took the
  // recording and both people's review history with it, with no way back.
  const putAway = (w: Vocab) =>
    del.mutate(w, {
      onSuccess: () => {
        setEditing(null);
        toast.success('Word put away', {
          key: 'vocab-put-away',
          action: { label: 'Undo', onClick: () => restore.mutate(w.id) },
        });
      },
    });

  const putAwayChosen = () => {
    const ids = chosen.map((w) => w.id);
    delMany.mutate(ids, {
      onSuccess: () => {
        setSelected(new Set());
        toast.success(`${ids.length} words put away`, {
          key: 'vocab-put-away-many',
          action: { label: 'Undo', onClick: () => restoreMany.mutate(ids) },
        });
      },
    });
  };

  const tagChosen = () => {
    const add = bulkTag
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (!add.length) return;
    tagMany.mutate(
      { words: chosen, tags: add },
      {
        onSuccess: () => {
          setBulkTag('');
          setTagOpen(false);
        },
      }
    );
  };

  /** The desk's right pane: the ways in that are not one word at a time. */
  const inspector = (
    <div className="space-y-4">
      <Button full onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" /> New word
      </Button>
      <div>
        <SectionLabel as="p">Many at once</SectionLabel>
        <Button
          full
          size="sm"
          variant="secondary"
          onClick={() => setImportOpen(true)}
        >
          <ClipboardPaste className="h-4 w-4" /> Paste a list
        </Button>
        <p className="mt-1.5 font-sans text-xs text-muted">
          One word a line, its meaning after a tab, dash or equals sign.
        </p>
      </div>
      {canRecord && (
        <div>
          <SectionLabel as="p">Your voice</SectionLabel>
          <Button
            full
            size="sm"
            variant="secondary"
            disabled={!silent}
            onClick={() => setQueue(list.filter((w) => !w.audio_path))}
          >
            <Mic className="h-4 w-4" />
            {silent ? `Record the ${silent} silent` : 'Every word has it'}
          </Button>
          <p className="mt-1.5 font-sans text-xs text-muted">
            Or drop sound files on the list: each goes to the word it is named
            after.
          </p>
        </div>
      )}
      <StatPill
        value={list.length}
        label={`in ${LANG_LABELS[lang]}`}
        align="left"
      />
    </div>
  );

  const chip = (on: boolean) =>
    cn(
      'lift-press shrink-0 rounded-full px-3.5 py-1.5 font-sans text-[12.5px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold',
      on
        ? 'bg-accent text-accent-fg'
        : 'border border-fg/[0.08] bg-surface text-muted'
    );

  return (
    <Desk inspector={inspector}>
      <div className="curtain-reveal space-y-2.5 pb-2">
        <Segmented
          full
          shape="bar"
          label="Which dictionary"
          value={lang}
          onChange={(v) => setLang(v as Lang)}
          options={[
            {
              value: learning,
              label: `${LANG_NATIVE_LABELS[learning]}, ${learningAll?.length ?? 0}`,
            },
            {
              value: native,
              label: `${LANG_NATIVE_LABELS[native]}, ${nativeAll?.length ?? 0}`,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Look for a word"
        />

        {(tags.length > 0 || silent > 0) && (
          <div className="-mx-[0.875rem] flex gap-1.5 overflow-x-auto px-[0.875rem] pb-0.5 [scrollbar-width:none]">
            <button
              type="button"
              aria-pressed={!tag && !silentOnly}
              onClick={() => {
                setTag(null);
                setSilentOnly(false);
              }}
              className={chip(!tag && !silentOnly)}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className={chip(tag === t)}
              >
                #{t}
              </button>
            ))}
            {silent > 0 && (
              <button
                type="button"
                aria-pressed={silentOnly}
                onClick={() => setSilentOnly((v) => !v)}
                className={chip(silentOnly)}
              >
                no audio, {silent}
              </button>
            )}
          </div>
        )}

        {shown.length === 0 ? (
          <Empty
            icon="📖"
            title={term || tag ? 'Nothing like that' : 'Nothing here yet'}
            hint={
              term || tag
                ? undefined
                : `Add the first word in ${LANG_LABELS[lang]}.`
            }
            action={
              term || tag ? undefined : (
                <Button onClick={() => setEditing('new')}>New word</Button>
              )
            }
          />
        ) : (
          <Dropzone
            accept="audio/*,.m4a,.mp3,.ogg,.webm,.wav"
            multiple
            pick={false}
            disabled={update.isPending}
            onFiles={(files) => void dropClips(files)}
          >
            <Card tone="hairline" className="px-3.5 py-0">
              <ul className="divide-y divide-fg/5">
                {shown.map((w) => (
                  <VocabRow
                    key={w.id}
                    word={w}
                    support={native}
                    url={w.audio_path ? clips?.get(w.audio_path) : undefined}
                    onClick={
                      selecting ? () => toggleOne(w.id) : () => setEditing(w)
                    }
                    onOpen={selecting ? undefined : () => setEditing(w)}
                    onRecord={canRecord ? () => setQueue([w]) : undefined}
                    leading={
                      selecting ? (
                        <Checkbox
                          size="md"
                          checked={selected.has(w.id)}
                          onChange={() => toggleOne(w.id)}
                          label={`Choose ${headwordOf(w)}`}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            </Card>
          </Dropzone>
        )}
        {shown.length > 0 && (
          <p className="px-1 font-sans text-[11.5px] font-medium text-muted/70">
            Tap a word for its card: notes, tags, voice thread and edits live
            there.
          </p>
        )}

        {selecting && chosen.length > 0 ? (
          <StickyFooter>
            <div
              className={cn(
                'grid gap-2',
                canRecord ? 'grid-cols-3' : 'grid-cols-2'
              )}
            >
              <Button
                variant="secondary"
                size="md"
                onClick={() => setTagOpen(true)}
              >
                <Tag className="h-4 w-4" /> Tag {chosen.length}
              </Button>
              {canRecord && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setQueue(chosen)}
                >
                  <Mic className="h-4 w-4" /> Record
                </Button>
              )}
              <Button
                variant="destructive"
                size="md"
                disabled={delMany.isPending}
                onClick={putAwayChosen}
              >
                <Trash2 className="h-4 w-4" /> Put away
              </Button>
            </div>
          </StickyFooter>
        ) : (
          !selecting &&
          !desk && (
            <StickyFooter>
              <Button full onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" /> New word
              </Button>
            </StickyFooter>
          )
        )}

        {editing && (
          <WordEditor
            word={editing === 'new' ? null : editing}
            lang={editing === 'new' ? lang : termLangOf(editing)}
            onClose={() => setEditing(null)}
            onPutAway={editing === 'new' ? undefined : () => putAway(editing)}
          />
        )}

        <Dialog
          placement="auto"
          open={tagOpen}
          onClose={() => setTagOpen(false)}
          title={`Tag ${chosen.length} ${chosen.length === 1 ? 'word' : 'words'}`}
          size="sm"
        >
          <div className="space-y-3">
            <Field label="Tags" hint="Separate with commas">
              <Input
                tone="ink"
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') tagChosen();
                }}
                placeholder="food, lesson 8"
                autoFocus
              />
            </Field>
            <Button
              full
              disabled={!bulkTag.trim() || tagMany.isPending}
              onClick={tagChosen}
            >
              Tag them
            </Button>
          </div>
        </Dialog>

        <ImportWordsDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          termLang={lang}
          meaningLang={lang === native ? learning : native}
          existing={list}
        />
        <RecordQueueDialog
          open={queue !== null}
          onClose={() => setQueue(null)}
          words={queue ?? []}
          support={native}
        />
        {!desk && (
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 font-sans text-[12.5px] font-bold text-gold"
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste a list
            </button>
            {canRecord && silent > 0 && (
              <button
                type="button"
                onClick={() => setQueue(list.filter((w) => !w.audio_path))}
                className="inline-flex min-h-[44px] items-center gap-1.5 font-sans text-[12.5px] font-bold text-gold"
              >
                <Mic className="h-3.5 w-3.5" /> Record the {silent} silent
              </button>
            )}
          </div>
        )}
      </div>
    </Desk>
  );
}
