import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  Field,
  Fieldset,
  Input,
  SectionLabel,
  Segmented,
  Select,
  Textarea,
  type AudioClip,
} from '@kernel/ui';
import { useAddVocab, useUpdateVocab, useWordUses } from '../api/vocab';
import { supportLangs, useLanguages } from '../lib/languages';
import { AudioField, VoiceThread } from './kit';
import {
  LANG_LABELS,
  LANG_NATIVE_LABELS,
  type Lang,
  type Vocab,
} from '../types';

/**
 * One word's card: the word, what it means in the two languages that are
 * not itself, how it sounds, what kind of word it is, its tags, her voice on
 * it and every recording of it. Everything about a word lives here; the
 * list row only shows it.
 */
export function WordEditor({
  word,
  lang,
  onClose,
  onPutAway,
}: {
  word: Vocab | null;
  /** The language the headword is written in. */
  lang: Lang;
  onClose: () => void;
  /** Offered for an existing word; the caller shows the Undo toast. */
  onPutAway?: () => void;
}) {
  const { native } = useLanguages();
  const add = useAddVocab();
  const update = useUpdateVocab();
  const { data: uses } = useWordUses(word?.id);

  // The three columns, always all three - which one is the word and which two
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
  // languages that are not the word itself - for a Spanish word that includes
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

  const pending = add.isPending || update.isPending;
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
      size="lg"
    >
      <div className="space-y-3.5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
          <Field label={`In ${LANG_NATIVE_LABELS[lang]}`}>
            <Input
              tone="ink"
              serif
              value={text[lang]}
              onChange={(e) => set(lang, e.target.value)}
              lang={lang}
              autoFocus={!word}
            />
          </Field>
          {noteLangs.map((l) => (
            <Field key={l} label={`In ${LANG_NATIVE_LABELS[l]}`}>
              <Input
                tone="ink"
                value={text[l]}
                onChange={(e) => set(l, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Sounds like">
            <Input
              tone="ink"
              value={translit}
              onChange={(e) => setTranslit(e.target.value)}
              placeholder={lang === 'ru' ? 'spasibo' : 'grasias'}
            />
          </Field>
          {/* Russian stress is phonemic and unwritten; Spanish writes its own. */}
          {lang === 'ru' && (
            <Field label="With the stress">
              <Input
                tone="ink"
                serif
                value={stress}
                onChange={(e) => setStress(e.target.value)}
                placeholder="спаси́бо"
                lang="ru"
              />
            </Field>
          )}
          <Field label="Kind">
            <Select
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              className="rounded border-fg/[0.12]"
            >
              <option value="">-</option>
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
          <Field label="Tags" className={lang === 'ru' ? 'md:col-span-3' : ''}>
            <Input
              tone="ink"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="food, verbs, lesson 8"
            />
          </Field>
        </div>

        {/* Recording can be added or replaced at ANY time - it used to be
            only at creation, so fixing a bad clip meant deleting the word and
            every review of it. */}
        <div className="space-y-2 rounded-card border border-fg/[0.07] bg-surface px-3.5 py-3">
          <AudioField
            label="Say it"
            hint={
              word?.audio_path
                ? 'Current recording, replace any time'
                : undefined
            }
            currentPath={word?.audio_path}
            onClip={setAudio}
          />
          {uses && uses.length > 0 && (
            <p className="font-sans text-xs font-medium text-muted">
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
        </div>

        {/* The escape hatch for a word with no clean one-word translation -
            успеть, тоска, давай, or "bacán". Written in whichever language the
            person reading it actually thinks in. */}
        <Fieldset label="A note">
          <div className="space-y-1.5">
            <Segmented
              shape="bar"
              value={noteLang}
              onChange={(v) => setNoteLang(v as Lang)}
              options={noteLangs.map((l) => ({
                value: l,
                label: LANG_NATIVE_LABELS[l],
              }))}
            />
            <Textarea
              tone="ink"
              value={notes[noteLang]}
              onChange={(e) => setNote(noteLang, e.target.value)}
              rows={2}
              placeholder="used when you finally manage to…"
            />
          </div>
        </Fieldset>

        {word && (
          <div>
            <SectionLabel as="p" note="tries and answers">
              Said aloud
            </SectionLabel>
            <VoiceThread word={word} />
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          {word && onPutAway && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onPutAway}
              className="md:mr-auto"
            >
              <Trash2 className="h-4 w-4" /> Put away
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={!text[lang].trim() || pending}
            >
              {word ? 'Save word' : 'Add to the dictionary'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
