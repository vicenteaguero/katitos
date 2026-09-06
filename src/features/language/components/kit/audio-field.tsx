import { useState } from 'react';
import { Upload } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import {
  AudioRecorder,
  Dropzone,
  Fieldset,
  PlayButton,
  extForMime,
  type AudioClip,
} from '@kernel/ui';

/**
 * A recording, wherever it comes from.
 *
 * Her voice, recorded here; or a file she already has, dropped in from the
 * desktop or picked on the phone. Whatever is on the row now plays above, so
 * "replace it" is a decision and not a guess. The three screens that each
 * drew this - the dictionary, the word picker, the question editor - share
 * it now, and share its fixes: a Fieldset (never a label that presses
 * Record), a reset key so the recorder starts clean after a save.
 */
export function AudioField({
  label,
  hint,
  currentPath,
  onClip,
  resetKey,
}: {
  label: string;
  hint?: string;
  /** What is on the row already, if anything. */
  currentPath?: string | null;
  /** The new clip - or null when the recording is discarded. */
  onClip: (clip: AudioClip | null) => void;
  resetKey?: string | number;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  const fromFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setPicked(file.name);
    onClip({
      blob: file,
      mime: file.type || 'audio/mpeg',
      ext: file.name.includes('.')
        ? file.name.split('.').pop()!.toLowerCase()
        : extForMime(file.type),
      durationMs: 0,
    });
  };

  return (
    <Fieldset label={label} hint={hint}>
      <div className="space-y-2">
        {currentPath && (
          <PlayButton
            bucket={BUCKETS.languageAudio}
            path={currentPath}
            size="sm"
            label="What is on it now"
          />
        )}
        <AudioRecorder
          onRecorded={(clip) => {
            setPicked(null);
            onClip(clip);
          }}
          resetKey={resetKey}
        />
        <Dropzone
          accept="audio/*,.m4a,.mp3,.ogg,.webm,.wav"
          onFiles={fromFile}
          className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 font-sans text-xs text-muted"
        >
          <Upload className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {picked ?? 'Or drop a sound file here'}
          </span>
        </Dropzone>
      </div>
    </Fieldset>
  );
}
