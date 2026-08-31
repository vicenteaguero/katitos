import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ClipboardPaste, Mic, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Checkbox,
  Chip,
  ChipRow,
  Desk,
  Dialog,
  Dropzone,
  Empty,
  Field,
  FieldRow,
  Fieldset,
  Input,
  Kicker,
  ROW_TOOL,
  SearchInput,
  Segmented,
  Select,
  StatPill,
  Textarea,
  toast,
  TopBarButton,
  useDesk,
  useTopBarAction,
  type AudioClip,
} from '@kernel/ui';
import {
  useAddVocab,
  useDeleteVocab,
  useDeleteVocabMany,
  useRestoreVocab,
  useRestoreVocabMany,
  useTagVocabMany,
  useUpdateVocab,
  useVocab,
  useWordUses,
} from '../api/vocab';
import { useLanguages, supportLangs } from '../lib/languages';
import { AudioField, VocabRow, VoiceThread } from '../components/kit';
import { headword as headwordOf, termLangOf } from '../lib/pick';
import { matchClips } from '../lib/match-clips';
import { ImportWordsDialog } from '../components/import-words-dialog';
import { RecordQueueDialog } from '../components/record-queue-dialog';
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
 * The switch at the top says which one you are looking at — it used to say
 * EN / ES, which was not the language of the words at all but the language they
 * were explained in, and it left every Spanish word we own unreachable.
 */
export function DictionaryRoute() {
  useDesk();
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

  const [editing, setEditing] = useState<Vocab | 'new' | null>(null);

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <Segmented
        value={lang}
        onChange={(v) => setLang(v as Lang)}
        options={[
          { value: learning, label: LANG_NATIVE_LABELS[learning] },
          { value: native, label: LANG_NATIVE_LABELS[native] },
        ]}
      />
      <TopBarButton label="New word" onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" />
      </TopBarButton>
    </div>,
    [lang, learning, native]
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
  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of list)
      for (const t of w.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [list]);
  const shown = tag ? list.filter((w) => (w.tags ?? []).includes(tag)) : list;

  // Many at once: a box on every row, and one bar that acts on the lot.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosen = shown.filter((w) => selected.has(w.id));
  const [bulkTag, setBulkTag] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const silent = list.filter((w) => !w.audio_path).length;

  // ONE signing request for every recording on the screen, rather than one per
  // word — this list can be five hundred long.
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
        missed ? ` · ${missed} not named after a word` : ''
      }`
    );
  };

  // Put away, not destroyed — and back in one tap. A real delete took the
  // recording and both people's review history with it, with no way back.
  const putAway = (w: Vocab) =>
    del.mutate(w, {
      onSuccess: () =>
        toast.success('Word put away', {
          key: 'vocab-put-away',
          action: { label: 'Undo', onClick: () => restore.mutate(w.id) },
        }),
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
      { onSuccess: () => setBulkTag('') }
    );
  };

  /** The desk's right pane: the ways in that are not one word at a time. */
  const inspector = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Kicker as="p">Many at once</Kicker>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setImportOpen(true)}
        >
          <ClipboardPaste size={13} /> Paste a list
        </Button>
        <p className="font-sans text-xs text-muted">
          One word a line, its meaning after a tab, dash or equals sign.
        </p>
      </div>
      <div className="space-y-1.5">
        <Kicker as="p">Your voice</Kicker>
        <Button
          size="xs"
          variant="secondary"
          disabled={!silent}
          onClick={() => setQueueOpen(true)}
        >
          <Mic size={13} />{' '}
          {silent ? `Record the ${silent} silent` : 'Every word has it'}
        </Button>
        <p className="font-sans text-xs text-muted">
          Or drop sound files on the list — each goes to the word it is named
          after.
        </p>
      </div>
      <StatPill
        value={list.length}
        label={`in ${LANG_LABELS[lang]}`}
        align="left"
      />
    </div>
  );

  return (
    <Desk inspector={inspector}>
      <div className="curtain-reveal space-y-2">
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Look for a word"
            className="min-w-0 flex-1"
          />
          <Button
            size="xs"
            variant="secondary"
            onClick={() => setImportOpen(true)}
            className="md:hidden"
          >
            <ClipboardPaste size={13} /> Paste
          </Button>
        </div>

        {tags.length > 0 && (
          <ChipRow>
            {tags.map((t) => (
              <Chip
                key={t}
                selected={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
              >
                #{t}
              </Chip>
            ))}
          </ChipRow>
        )}

        {chosen.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <Kicker as="span">{chosen.length} chosen</Kicker>
            <Input
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tagChosen();
              }}
              placeholder="food, lesson 8"
              aria-label="Tags to add"
              className="h-8 w-40 text-sm"
            />
            <Button
              size="xs"
              variant="secondary"
              disabled={!bulkTag.trim() || tagMany.isPending}
              onClick={tagChosen}
            >
              <Tag size={13} /> Tag them
            </Button>
            <Button
              size="xs"
              variant="secondary"
              disabled={delMany.isPending}
              onClick={putAwayChosen}
            >
              <Trash2 size={13} /> Put them away
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto font-sans text-xs text-muted hover:text-fg"
            >
              clear
            </button>
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
          />
        ) : (
          <Dropzone
            accept="audio/*,.m4a,.mp3,.ogg,.webm,.wav"
            multiple
            disabled={update.isPending}
            onFiles={(files) => void dropClips(files)}
          >
            <ul className="divide-y divide-fg/5 rounded-lg bg-surface px-3 md:columns-2 md:gap-4 md:[&>li]:break-inside-avoid">
              {shown.map((w) => (
                <VocabRow
                  key={w.id}
                  word={w}
                  support={native}
                  url={w.audio_path ? clips?.get(w.audio_path) : undefined}
                  trailing={
                    <>
                      <Checkbox
                        checked={selected.has(w.id)}
                        onChange={() => toggleOne(w.id)}
                        label={`Choose ${headwordOf(w)}`}
                      />
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => setEditing(w)}
                        className={ROW_TOOL}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Put away"
                        onClick={() => putAway(w)}
                        className={ROW_TOOL}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          </Dropzone>
        )}

        {editing && (
          <WordSheet
            word={editing === 'new' ? null : editing}
            lang={editing === 'new' ? lang : termLangOf(editing)}
            onClose={() => setEditing(null)}
          />
        )}

        <ImportWordsDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          termLang={lang}
          meaningLang={lang === native ? learning : native}
          existing={list}
        />
        <RecordQueueDialog
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          words={list}
          support={native}
        />
      </div>
    </Desk>
  );
}

function WordSheet({
  word,
  lang,
  onClose,
}: {
  word: Vocab | null;
  /** The language the headword is written in. */
  lang: Lang;
  onClose: () => void;
}) {
  const { native } = useLanguages();
  const add = useAddVocab();
  const update = useUpdateVocab();
  const { data: uses } = useWordUses(word?.id);

  // The three columns, always all three — which one is the word and which two
  // are its translations is decided by `lang`, not by the column's name.
  const [text, setText] = useState<Record<Lang, string>>({
    ru: word?.ru ?? '',
    en: word?.en ?? '',
    es: word?.es ?? '',
  });
  const [translit, setTranslit] = useState(word?.transliteration ?? '');
  const [stress, setStress] = useState(word?.stress ?? '');
  const [tags, setTags] = useState((word?.tags ?? []).join(', '));
  const [pos, setPos] = useState(word?.part_of_speech ?? '');
  const [audio, setAudio] = useState<AudioClip | null>(null);

  // A note is written FOR the person learning, so it is offered in the two
  // languages that are not the word itself — for a Spanish word that includes
  // Russian, which the old screen had no column for at all.
  const noteLangs = useMemo(() => supportLangs(lang, native), [lang, native]);
  const [noteLang, setNoteLang] = useState<Lang>(noteLangs[0]);
  const [notes, setNotes] = useState<Record<Lang, string>>({
    ru: word?.notes_ru ?? '',
    en: word?.notes_en ?? '',
    es: word?.notes_es ?? '',
  });

  const set = (l: Lang, v: string) => setText((t) => ({ ...t, [l]: v }));
  const setNote = (l: Lang, v: string) => setNotes((n) => ({ ...n, [l]: v }));

  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const submit = () => {
    if (!text[lang].trim()) return;
    const shared = {
      ru: text.ru || null,
      en: text.en || null,
      es: text.es || null,
      transliteration: translit || null,
      stress: lang === 'ru' ? stress || null : null,
      tags: tagList,
    };
    if (word) {
      update.mutate(
        {
          id: word.id,
          patch: {
            ...shared,
            part_of_speech: pos || null,
            notes_ru: notes.ru || null,
            notes_en: notes.en || null,
            notes_es: notes.es || null,
          },
          audio,
          previousAudioPath: word.audio_path,
        },
        { onSuccess: onClose }
      );
    } else {
      add.mutate(
        {
          termLang: lang,
          ...shared,
          partOfSpeech: pos || null,
          notesRu: notes.ru,
          notesEn: notes.en,
          notesEs: notes.es,
          audio,
        },
        { onSuccess: onClose }
      );
    }
  };

  return (
    <Dialog
      placement="auto"
      open
      onClose={onClose}
      title={word ? 'This word' : `A new word in ${LANG_LABELS[lang]}`}
      size="md"
    >
      <div className="space-y-3">
        <Field label={`In ${LANG_LABELS[lang]}`}>
          <Input
            value={text[lang]}
            onChange={(e) => set(lang, e.target.value)}
            className="font-display text-lg"
            autoFocus
          />
        </Field>
        <FieldRow>
          {noteLangs.map((l) => (
            <Field key={l} label={LANG_NATIVE_LABELS[l]}>
              <Input value={text[l]} onChange={(e) => set(l, e.target.value)} />
            </Field>
          ))}
        </FieldRow>
        {/* Russian stress is phonemic and unwritten; Spanish writes its own. */}
        {lang === 'ru' && (
          <FieldRow>
            <Field label="Sounds like">
              <Input
                value={translit}
                onChange={(e) => setTranslit(e.target.value)}
                placeholder="spasibo"
              />
            </Field>
            <Field
              label="With the stress"
              hint="Hold a vowel on the keys below"
            >
              <Input
                value={stress}
                onChange={(e) => setStress(e.target.value)}
                className="font-display text-lg"
                placeholder="спаси́бо"
              />
            </Field>
          </FieldRow>
        )}

        {uses && uses.length > 0 && (
          <p className="font-sans text-xs text-muted">
            Taught in{' '}
            {uses.map((u, i) => (
              <span key={u.id}>
                {i > 0 && ', '}
                <Link
                  to={`/language/lesson/${u.id}`}
                  className="text-gold hover:underline"
                >
                  {u.title}
                </Link>
              </span>
            ))}
          </p>
        )}
        {/* The escape hatch for a word with no clean one-word translation —
            успеть, тоска, давай, or "bacán". Written in whichever language the
            person reading it actually thinks in. */}
        <Field
          label="What kind of word"
          hint="Optional — it makes the drills smarter later"
        >
          <Select value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="">—</option>
            <option value="noun">noun</option>
            <option value="verb">verb</option>
            <option value="adjective">adjective</option>
            <option value="adverb">adverb</option>
            <option value="pronoun">pronoun</option>
            <option value="preposition">preposition</option>
            <option value="phrase">phrase</option>
            <option value="other">other</option>
          </Select>
        </Field>
        <Fieldset label="A note">
          <div className="space-y-1.5">
            <Segmented
              value={noteLang}
              onChange={(v) => setNoteLang(v as Lang)}
              options={noteLangs.map((l) => ({
                value: l,
                label: LANG_NATIVE_LABELS[l],
              }))}
            />
            <Textarea
              value={notes[noteLang]}
              onChange={(e) => setNote(noteLang, e.target.value)}
              rows={2}
              placeholder="used when you finally manage to…"
            />
          </div>
        </Fieldset>

        <Field label="Tags" hint="Separate with commas — food, verbs, lesson 8">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>

        {/* Recording can be added or replaced at ANY time now — it used to be
            only at creation, so fixing a bad clip meant deleting the word and
            every review of it. */}
        <AudioField
          label="Say it"
          currentPath={word?.audio_path}
          onClip={setAudio}
        />
        {word && (
          <Fieldset
            label="Said aloud"
            hint="Every recording of this word — tries and answers"
          >
            <VoiceThread word={word} />
          </Fieldset>
        )}
        <Button
          full
          onClick={submit}
          disabled={!text[lang].trim() || add.isPending || update.isPending}
        >
          {word ? 'Save' : 'Add to the dictionary'}
        </Button>
      </div>
    </Dialog>
  );
}
