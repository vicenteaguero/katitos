import { useState } from 'react';
import { Mic } from 'lucide-react';
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
  type AudioClip,
} from '@kernel/ui';
import { useAlphabet, useRecordLetter } from '../api/alphabet';
import { useLanguages } from '../lib/languages';

/**
 * The thirty-three letters - the only place Russian can start.
 *
 * A dense wrap rather than a grid: no lines, no boxes, just the letters, the
 * way they would be written across a page. Tap one to hear it and read what it
 * does; hers is the voice that gets recorded.
 */
export function AlphabetRoute() {
  const { data: letters, isLoading } = useAlphabet();
  const { native: support } = useLanguages();
  // The id, not the row: the row is looked up fresh each render, so the sheet
  // shows "Hear it" the moment a recording lands instead of after reopening.
  const [openId, setOpenId] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioClip | null>(null);
  const [kept, setKept] = useState(0);
  const record = useRecordLetter();
  useDesk();

  if (isLoading) return <ListSkeleton rows={3} />;

  const list = letters ?? [];
  const open = list.find((l) => l.id === openId) ?? null;

  return (
    <Desk narrow>
      <div className="curtain-reveal space-y-3">
        <header>
          <p className="eyebrow">Thirty-three of them</p>
          <h1 className="font-display text-2xl font-semibold text-fg">
            The alphabet
          </h1>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {list.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setOpenId(l.id);
                setAudio(null);
              }}
              className={cn(
                'lift-press flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-surface-2 transition',
                open?.id === l.id && 'bg-accent text-accent-fg'
              )}
            >
              <span className="font-display text-xl leading-none text-fg">
                {l.letter}
                <span className="text-muted">{l.lower}</span>
              </span>
              <span className="mt-0.5 font-sans text-[0.55rem] uppercase tracking-[0.1em] text-muted">
                {(support === 'es' ? l.name_es : l.name_en) ?? ''}
              </span>
            </button>
          ))}
        </div>

        <Dialog
          placement="auto"
          open={!!open}
          onClose={() => setOpenId(null)}
          title={open ? `${open.letter} ${open.lower}` : ''}
          size="sm"
        >
          {open && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-5xl text-fg">
                  {open.letter}
                  <span className="text-muted">{open.lower}</span>
                </span>
                {open.audio_path && (
                  <PlayButton
                    bucket={BUCKETS.languageAudio}
                    path={open.audio_path}
                    label="Hear it"
                  />
                )}
              </div>

              <p className="font-sans text-sm text-fg">
                {(support === 'es' ? open.sound_hint_es : open.sound_hint_en) ??
                  ''}
              </p>

              {open.example_word && (
                <p className="font-sans text-sm text-muted">
                  <span className="font-display text-base text-fg">
                    {open.example_word}
                  </span>
                  {' - '}
                  {(support === 'es'
                    ? open.example_translation_es
                    : open.example_translation_en) ?? ''}
                </p>
              )}

              {/* A recording of a stranger saying Ы is worth much less than a
                recording of his teacher saying it. */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-sans text-xs text-muted">
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
                        { id: open.id, audio, previousPath: open.audio_path },
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
            </div>
          )}
        </Dialog>
      </div>
    </Desk>
  );
}
