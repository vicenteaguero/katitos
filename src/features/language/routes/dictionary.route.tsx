import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  AudioRecorder,
  Button,
  Empty,
  Field,
  FieldRow,
  Input,
  PlayButton,
  Segmented,
  Sheet,
  useTopBarAction,
  useWideLayout,
  type AudioClip,
} from '@kernel/ui';
import {
  useAddVocab,
  useDeleteVocab,
  useUpdateVocab,
  useVocab,
} from '../api/vocab';
import { useLangPrefs } from '../lib/lang-prefs';
import { meaningOf } from '../lib/pick';
import type { SupportLang, Vocab } from '../types';

/**
 * Every word we have ever been taught, and a way to add the next one.
 *
 * One entry per word, so a correction here reaches every lesson that word
 * appears in — the reason this stopped being a pile of per-deck cards.
 */
export function DictionaryRoute() {
  useWideLayout();
  const [search, setSearch] = useState('');
  // What the QUERY sees, a beat behind the box. Typing "привет" used to fire
  // six separate `limit 500` searches and keep all six in the cache.
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const support = useLangPrefs((s) => s.supportLang);
  const setSupport = useLangPrefs((s) => s.setSupport);
  const { data: words } = useVocab('ru', term);
  const del = useDeleteVocab();

  const [editing, setEditing] = useState<Vocab | 'new' | null>(null);

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <Segmented
        value={support}
        onChange={(v) => setSupport(v as SupportLang)}
        options={[
          { value: 'en', label: 'EN' },
          { value: 'es', label: 'ES' },
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
    [support]
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
          title={term ? 'Nothing like that' : 'The dictionary is empty'}
          hint={term ? undefined : 'Add the first word.'}
        />
      ) : (
        <ul className="divide-y divide-fg/5 rounded-lg bg-surface px-3 md:columns-2 md:gap-4 md:[&>li]:break-inside-avoid">
          {list.map((w) => (
            <li key={w.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base text-fg">
                  {w.ru}
                  {w.transliteration && (
                    <span className="ml-2 font-sans text-[0.68rem] text-muted">
                      {w.transliteration}
                    </span>
                  )}
                </span>
                <span className="block truncate font-sans text-xs text-muted">
                  {meaningOf(w, support)}
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
                onClick={() => del.mutate(w)}
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
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function WordSheet({
  word,
  onClose,
}: {
  word: Vocab | null;
  onClose: () => void;
}) {
  const add = useAddVocab();
  const update = useUpdateVocab();
  const [ru, setRu] = useState(word?.ru ?? '');
  const [en, setEn] = useState(word?.en ?? '');
  const [es, setEs] = useState(word?.es ?? '');
  const [translit, setTranslit] = useState(word?.transliteration ?? '');
  const [stress, setStress] = useState(word?.stress ?? '');
  const [audio, setAudio] = useState<AudioClip | null>(null);

  const submit = () => {
    if (!ru.trim()) return;
    if (word) {
      update.mutate(
        {
          id: word.id,
          patch: {
            ru,
            en: en || null,
            es: es || null,
            transliteration: translit || null,
            stress: stress || null,
          },
          audio,
        },
        { onSuccess: onClose }
      );
    } else {
      add.mutate(
        {
          termLang: 'ru',
          ru,
          en,
          es,
          transliteration: translit,
          stress,
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
      title={word ? 'This word' : 'A new word'}
      size="half"
    >
      <div className="space-y-3">
        <Field label="In Russian">
          <Input
            value={ru}
            onChange={(e) => setRu(e.target.value)}
            className="font-display text-lg"
            autoFocus
          />
        </Field>
        <FieldRow>
          <Field label="English">
            <Input value={en} onChange={(e) => setEn(e.target.value)} />
          </Field>
          <Field label="Español">
            <Input value={es} onChange={(e) => setEs(e.target.value)} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Sounds like">
            <Input
              value={translit}
              onChange={(e) => setTranslit(e.target.value)}
              placeholder="spasibo"
            />
          </Field>
          <Field label="Stress" hint="Which syllable">
            <Input
              value={stress}
              onChange={(e) => setStress(e.target.value)}
              placeholder="spaSIbo"
            />
          </Field>
        </FieldRow>
        {/* Recording can be added or replaced at ANY time now — it used to be
            only at creation, so fixing a bad clip meant deleting the word and
            every review of it. */}
        <Field label="Say it">
          <AudioRecorder onRecorded={setAudio} />
        </Field>
        <Button
          full
          onClick={submit}
          disabled={!ru.trim() || add.isPending || update.isPending}
        >
          {word ? 'Save' : 'Add to the dictionary'}
        </Button>
      </div>
    </Sheet>
  );
}
