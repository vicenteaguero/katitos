import { useMemo, useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  AudioRecorder,
  Button,
  Desk,
  Dialog,
  ListSkeleton,
  PlayButton,
  useDesk,
  useScreenChrome,
  type AudioClip,
} from '@kernel/ui';
import { useAlphabet, useRecordLetter } from '../api/alphabet';
import { useAllVocab } from '../api/vocab';
import { useLanguages } from '../lib/languages';
import { headword } from '../lib/pick';
import { ActionGrid } from '../components/kit';

/**
 * The thirty-three letters - the only place Russian can start.
 *
 * Four to a row, so the grid never drifts: the pair, its name underneath,
 * and a gold dot on the ones that have her voice. Tap one to hear it and
 * read what it does; hers is the voice that gets recorded.
 */
export function AlphabetRoute() {
  const { data: letters, isLoading } = useAlphabet();
  const { native: support } = useLanguages();
  const { data: words } = useAllVocab('ru');
  // The id, not the row: the row is looked up fresh each render, so the sheet
  // shows "Hear it" the moment a recording lands instead of after reopening.
  const [openId, setOpenId] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioClip | null>(null);
  const [kept, setKept] = useState(0);
  const record = useRecordLetter();
  useDesk();

  const list = useMemo(() => letters ?? [], [letters]);
  const recorded = list.filter((l) => l.audio_path).length;
  const hers = support === 'ru';

  useScreenChrome(
    {
      title: 'Alphabet',
      subtitle: list.length
        ? `${recorded} of ${list.length} in ${hers ? 'your' : 'her'} voice`
        : undefined,
      stage: 'house',
    },
    [recorded, list.length, hers]
  );

  if (isLoading) return <ListSkeleton rows={3} header={false} />;

  const open = list.find((l) => l.id === openId) ?? null;
  // The example word, if it is in the dictionary with her recording.
  const example =
    open?.example_word && words
      ? words.find(
          (w) =>
            headword(w).replace(/́/g, '').toLowerCase() ===
            open.example_word!.replace(/́/g, '').toLowerCase()
        )
      : undefined;

  return (
    <Desk narrow>
      <div className="curtain-reveal space-y-3 pb-2">
        <ActionGrid cols={4} role="list">
          {list.map((l) => (
            <button
              key={l.id}
              type="button"
              role="listitem"
              onClick={() => {
                setOpenId(l.id);
                setAudio(null);
              }}
              className={cn(
                'lift-press relative flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-[14px] border bg-surface px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-gold',
                open?.id === l.id ? 'border-gold' : 'border-fg/[0.06]'
              )}
            >
              <span className="font-display text-2xl leading-none text-fg">
                {l.letter}
                <span className="text-muted">{l.lower}</span>
              </span>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {(support === 'es' ? l.name_es : l.name_en) ?? ''}
              </span>
              {l.audio_path && (
                <span
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold"
                  aria-label="Recorded"
                />
              )}
            </button>
          ))}
        </ActionGrid>
        <p className="px-1 font-sans text-[11.5px] font-medium text-muted/70">
          Gold dot = recorded in {hers ? 'your' : 'her'} voice. Tap any letter
          to hear it{hers ? ' and record yours' : ''}.
        </p>

        <Dialog
          placement="auto"
          open={!!open}
          onClose={() => setOpenId(null)}
          label={open ? `${open.letter} ${open.lower}` : 'A letter'}
          size="sm"
        >
          {open && (
            <div className="space-y-3.5 pb-1">
              <div className="flex items-center gap-4">
                <span className="font-display text-[64px] leading-none text-fg">
                  {open.letter}
                  <span className="text-muted">{open.lower}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[15px] font-extrabold text-fg">
                    {(support === 'es' ? open.name_es : open.name_en) ?? ''}
                  </span>
                  <span className="block font-sans text-[13px] leading-snug text-muted">
                    {(support === 'es'
                      ? open.sound_hint_es
                      : open.sound_hint_en) ?? ''}
                  </span>
                </span>
                {open.audio_path ? (
                  <PlayButton
                    bucket={BUCKETS.languageAudio}
                    path={open.audio_path}
                    size="md"
                    label="Hear it"
                    className="h-[52px] w-[52px] rounded-full bg-accent text-accent-fg"
                  />
                ) : (
                  <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-dashed border-gold/40 text-muted">
                    <Volume2 className="h-5 w-5" />
                  </span>
                )}
              </div>

              {open.example_word && (
                <div className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-fg/[0.06] bg-surface px-3.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg text-fg">
                      {open.example_word}
                    </span>
                    <span className="block font-sans text-xs font-medium text-muted">
                      {(support === 'es'
                        ? open.example_translation_es
                        : open.example_translation_en) ?? ''}
                    </span>
                  </span>
                  {example?.audio_path && (
                    <PlayButton
                      bucket={BUCKETS.languageAudio}
                      path={example.audio_path}
                      size="md"
                      label={`Hear ${open.example_word}`}
                    />
                  )}
                </div>
              )}

              {/* A recording of a stranger saying Ы is worth much less than a
                recording of his teacher saying it. */}
              {hers && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-sans text-xs font-semibold text-muted">
                    <Mic className="h-3.5 w-3.5" /> Say it for him
                  </p>
                  <AudioRecorder
                    onRecorded={setAudio}
                    resetKey={`${openId}:${kept}`}
                  />
                  {audio && (
                    <Button
                      full
                      disabled={record.isPending}
                      onClick={() =>
                        record.mutate(
                          {
                            id: open.id,
                            audio,
                            previousPath: open.audio_path,
                          },
                          {
                            onSuccess: () => {
                              setAudio(null);
                              setKept((n) => n + 1);
                            },
                          }
                        )
                      }
                    >
                      Keep this one
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </Dialog>
      </div>
    </Desk>
  );
}
