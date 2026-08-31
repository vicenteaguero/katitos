import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  AudioRecorder,
  Button,
  Empty,
  Field,
  FieldRow,
  Fieldset,
  Input,
  PlayButton,
  Segmented,
  Sheet,
  Textarea,
  toast,
  useTopBarAction,
  useWideLayout,
  type AudioClip,
} from '@kernel/ui';
import {
  useAddVocab,
  useDeleteVocab,
  useRestoreVocab,
  useUpdateVocab,
  useVocab,
} from '../api/vocab';
import { useLanguages, supportLangs } from '../lib/languages';
import { headword, meaningOf, termLangOf } from '../lib/pick';
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
  useWideLayout();
  const { native, learning } = useLanguages();
  const [lang, setLang] = useState<Lang>(learning);
  useEffect(() => setLang(learning), [learning]);

  const [search, setSearch] = useState('');
  // What the QUERY sees, a beat behind the box. Typing "привет" used to fire
  // six separate `limit 500` searches and keep all six in the cache.
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: words } = useVocab(lang, term);
  const del = useDeleteVocab();
  const restore = useRestoreVocab();

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
      <button
        type="button"
        onClick={() => setEditing('new')}
        aria-label="New word"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>,
    [lang, learning, native]
  );

  const list = words ?? [];

  // ONE signing request for every recording on the screen, rather than one per
  // word — this list can be five hundred long.
  const { data: clips } = useSignedUrls(
    BUCKETS.languageAudio,
    list.map((w) => w.audio_path),
    { proxy: false }
  );

  return (
    <div className="curtain-reveal space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Look for a word"
          className="pl-9"
        />
      </div>

      {list.length === 0 ? (
        <Empty
          icon="📖"
          title={term ? 'Nothing like that' : 'Nothing here yet'}
          hint={
            term ? undefined : `Add the first word in ${LANG_LABELS[lang]}.`
          }
        />
      ) : (
        <ul className="divide-y divide-fg/5 rounded-lg bg-surface px-3 md:columns-2 md:gap-4 md:[&>li]:break-inside-avoid">
          {list.map((w) => (
            <li key={w.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base text-fg">
                  {headword(w)}
                  {w.transliteration && (
                    <span className="ml-2 font-sans text-[0.68rem] text-muted">
                      {w.transliteration}
                    </span>
                  )}
                </span>
                <span className="block truncate font-sans text-xs text-muted">
                  {meaningOf(w, native)}
                </span>
              </span>
              {w.audio_path && (
                <PlayButton url={clips?.get(w.audio_path)} size="sm" />
              )}
              <button
                type="button"
                aria-label="Edit"
                onClick={() => setEditing(w)}
                className="shrink-0 text-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={() =>
                  // Put away, not destroyed — and back in one tap. A real
                  // delete took the recording and both people's review
                  // history with it, from one tap with no way back.
                  del.mutate(w, {
                    onSuccess: () =>
                      toast.success('Word put away', {
                        key: 'vocab-put-away',
                        action: {
                          label: 'Undo',
                          onClick: () => restore.mutate(w.id),
                        },
                      }),
                  })
                }
                className="shrink-0 text-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <WordSheet
          word={editing === 'new' ? null : editing}
          lang={editing === 'new' ? lang : termLangOf(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
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
    <Sheet
      open
      onClose={onClose}
      title={word ? 'This word' : `A new word in ${LANG_LABELS[lang]}`}
      size="half"
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

        {/* The escape hatch for a word with no clean one-word translation —
            успеть, тоска, давай, or "bacán". Written in whichever language the
            person reading it actually thinks in. */}
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
        {/* A Fieldset, not a Field: a Field is a <label>, and tapping the
            caption of a label presses the first button inside it — which was
            Record. */}
        <Fieldset label="Say it">
          <AudioRecorder onRecorded={setAudio} />
        </Fieldset>
        <Button
          full
          onClick={submit}
          disabled={!text[lang].trim() || add.isPending || update.isPending}
        >
          {word ? 'Save' : 'Add to the dictionary'}
        </Button>
      </div>
    </Sheet>
  );
}
