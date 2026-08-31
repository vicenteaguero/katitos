import { useState } from 'react';
import { Mic, Send, Trash2 } from 'lucide-react';
import { usePartner, useUserId } from '@kernel/auth';
import { BUCKETS } from '@kernel/storage';
import {
  AudioRecorder,
  Button,
  PlayButton,
  ROW_TOOL,
  toast,
  type AudioClip,
} from '@kernel/ui';
import { useDeleteVoice, useSendVoice, useVoiceFor } from '../../api/voice';
import { agoLabel } from '../../lib/due';
import { headword, termLangOf } from '../../lib/pick';
import type { Vocab, Voice } from '../../types';

/**
 * The recordings of one word — his tries, her answers — and a way to add
 * the next one.
 *
 * `compact` is the study card's version: only the other one's latest, and
 * the microphone. The full thread lives on the word in the dictionary.
 */
export function VoiceThread({
  word,
  compact = false,
  startOpen = false,
}: {
  word: Vocab;
  compact?: boolean;
  /** Open on the microphone straight away — the wrong-list's "say it for him". */
  startOpen?: boolean;
}) {
  const userId = useUserId();
  const { partner } = usePartner();
  const { data: rows } = useVoiceFor(word.id);
  const send = useSendVoice();
  const del = useDeleteVoice();
  const [open, setOpen] = useState(startOpen);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [key, setKey] = useState(0);

  const list = rows ?? [];
  const theirs = list.find((r) => r.user_id !== userId);
  const shown = compact ? (theirs ? [theirs] : []) : list;
  const who = (r: Voice) =>
    r.user_id === userId ? 'You' : (partner?.display_name ?? 'Your love');

  const close = () => {
    setOpen(false);
    setClip(null);
    setKey((k) => k + 1);
  };
  const submit = () => {
    if (!clip) return;
    send.mutate(
      {
        vocabId: word.id,
        word: headword(word),
        lang: termLangOf(word),
        clip,
        replyTo: theirs?.id ?? null,
      },
      {
        onSuccess: () => {
          close();
          toast.success('Sent');
        },
      }
    );
  };

  return (
    <div className="space-y-1.5">
      {shown.length > 0 && (
        <ul className="space-y-1">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <PlayButton
                bucket={BUCKETS.languageAudio}
                path={r.audio_path}
                size="sm"
                label={`${who(r)} — play`}
              />
              <span className="min-w-0 flex-1 truncate font-sans text-xs text-muted">
                {who(r)} · {agoLabel(r.created_at)}
              </span>
              {!compact && r.user_id === userId && (
                <button
                  type="button"
                  aria-label="Take it back"
                  onClick={() => del.mutate(r)}
                  className={ROW_TOOL}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!open ? (
        <Button size="xs" variant="secondary" onClick={() => setOpen(true)}>
          <Mic size={13} /> {theirs ? 'Answer' : 'Say it'}
        </Button>
      ) : (
        <div className="space-y-1.5">
          <AudioRecorder resetKey={key} onRecorded={setClip} />
          <div className="flex gap-1.5">
            <Button
              size="xs"
              disabled={!clip || send.isPending}
              onClick={submit}
            >
              <Send size={13} /> Send
            </Button>
            <Button size="xs" variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
