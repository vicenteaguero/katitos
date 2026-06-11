import { useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap, Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Empty,
  Fab,
  LoadingScreen,
  PageHeader,
  Segmented,
  Sheet,
  toast,
} from '@kernel/ui';
import { usePhrases } from '../api/phrases.queries';
import { useDeletePhrase } from '../api/phrases.mutations';
import { PhraseCard } from '../components/phrase-card';
import { PhraseForm } from '../components/phrase-form';
import { LANG_LABELS, type Lang, type Phrase } from '../types';

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ru', label: LANG_LABELS.ru },
  { value: 'es', label: LANG_LABELS.es },
];

export function PhrasesListRoute() {
  const [language, setLanguage] = useState<Lang>('ru');
  const [adding, setAdding] = useState(false);

  useTableSync('phrases', qk.phrases.list(language));
  const { data, isLoading, isError } = usePhrases(language);
  const del = useDeletePhrase();

  const handleDelete = (p: Phrase) => {
    if (confirm(`Delete "${p.text}"?`)) {
      del.mutate(
        { id: p.id, language },
        {
          onSuccess: () => toast.success('Deleted'),
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  const hasPhrases = !!data && data.length > 0;

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader title="Language" subtitle="Learning each other's tongue 💙" />

      <section className="space-y-7">
        <p className="eyebrow">The Phrasebook</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            options={LANG_OPTIONS}
            value={language}
            onChange={setLanguage}
          />
          {hasPhrases && (
            <Link to={`/language/practice/${language}`}>
              <Button variant="secondary" size="sm">
                <GraduationCap size={16} /> Practice
              </Button>
            </Link>
          )}
        </div>

        {/* The relationship as one gold-stitched line — her tongue to his. */}
        <hr className="seam" aria-hidden="true" />

        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : !hasPhrases ? (
          <Empty
            icon="🗣️"
            title={`No ${LANG_LABELS[language]} phrases yet`}
            hint="Tap + to teach your partner something new."
          />
        ) : (
          <div className="curtain-stagger space-y-4">
            {data.map((p) => (
              <PhraseCard key={p.id} phrase={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      <Fab label="Add phrase" onClick={() => setAdding(true)}>
        <Plus />
      </Fab>

      <Sheet open={adding} onClose={() => setAdding(false)} title="New phrase">
        <PhraseForm
          defaultLanguage={language}
          onDone={() => setAdding(false)}
        />
      </Sheet>
    </div>
  );
}
