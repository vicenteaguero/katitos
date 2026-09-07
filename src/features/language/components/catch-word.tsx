import { useState } from 'react';
import { Mic, Plus } from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  AudioRecorder,
  Button,
  Dialog,
  Input,
  type AudioClip,
} from '@kernel/ui';
import { useCatchWord } from '../api/catch-word';
import { LANG_NATIVE_LABELS, type LessonFull } from '../types';

/** The sheet: the word, its meaning, her voice if she has a second. */
export function CatchWordSheet({
  open,
  onClose,
  lesson,
  blockId,
}: {
  open: boolean;
  onClose: () => void;
  lesson: LessonFull;
  /** The vocab block on screen, if the slide is one. */
  blockId: string | null;
}) {
  const { catchWord, busy, target, meaningLang } = useCatchWord(
    lesson,
    blockId
  );
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState(0);

  const submit = async () => {
    if (await catchWord(term, meaning, clip)) {
      setTerm('');
      setMeaning('');
      setClip(null);
      setRecording(false);
      setTake((t) => t + 1);
      onClose();
    }
  };

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="A word came up"
      size="sm"
    >
      <div className="space-y-2.5">
        <Input
          tone="ink"
          serif
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={
            target === 'ru' ? 'По-русски…' : `En ${LANG_NATIVE_LABELS[target]}…`
          }
          aria-label={`In ${LANG_NATIVE_LABELS[target]}`}
          lang={target}
          autoFocus
        />
        <Input
          tone="ink"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder={`Meaning, in ${LANG_NATIVE_LABELS[meaningLang]}…`}
          aria-label={`Meaning, in ${LANG_NATIVE_LABELS[meaningLang]}`}
        />
        {recording ? (
          <AudioRecorder resetKey={take} onRecorded={setClip} />
        ) : (
          <div className="grid grid-cols-[50px_1fr] gap-2">
            <button
              type="button"
              aria-label="Say it"
              onClick={() => setRecording(true)}
              className={cn(
                'lift-press flex h-[50px] items-center justify-center rounded-[14px] border border-dashed border-gold/45 bg-surface text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold',
                clip && 'border-solid bg-accent text-accent-fg'
              )}
            >
              <Mic className="h-[18px] w-[18px]" />
            </button>
            <Button
              full
              className="h-[50px] rounded-[14px]"
              disabled={!term.trim() || busy}
              onClick={() => void submit()}
            >
              Into the lesson + dictionary
            </Button>
          </div>
        )}
        {recording && (
          <Button
            full
            className="h-[50px] rounded-[14px]"
            disabled={!term.trim() || busy}
            onClick={() => void submit()}
          >
            <Plus className="h-4 w-4" /> Into the lesson + dictionary
          </Button>
        )}
        <p className="text-center font-sans text-[11.5px] font-medium text-muted/70">
          Lands in this slide's word list and in the dictionary, one tap.
        </p>
      </div>
    </Dialog>
  );
}
