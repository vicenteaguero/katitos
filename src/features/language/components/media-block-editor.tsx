import { useState } from 'react';
import { Link2, Paperclip, Trash2 } from 'lucide-react';
import {
  Button,
  Field,
  FilePickerButton,
  Input,
  Segmented,
  Sheet,
  Spinner,
  toast,
} from '@kernel/ui';
import { useAddLink, useUploadMedia } from '../api/media';
import type { Media } from '../types';

/**
 * Give a media block something to show.
 *
 * A worksheet, a photograph, or a video — the three things she actually hands
 * out. Uploading and linking are the same gesture from her side, so they sit
 * behind one control rather than two separate flows.
 */
export function MediaBlockEditor({
  open,
  onClose,
  courseId,
  lessonId,
  current,
  onAttached,
  onDetach,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  lessonId: string;
  current?: Media;
  /** Called with the new attachment's id, to store on the block. */
  onAttached: (mediaId: string) => void;
  onDetach: () => void;
}) {
  const upload = useUploadMedia();
  const addLink = useAddLink();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const attach = async (file?: File) => {
    if (file) {
      const media = await upload.mutateAsync({
        courseId,
        lessonId,
        file,
        title: title || undefined,
      });
      if (media) onAttached(media.id);
    } else {
      if (!url.trim()) return;
      const media = await addLink.mutateAsync({
        courseId,
        lessonId,
        url,
        title: title || undefined,
      });
      if (media) onAttached(media.id);
    }
    setUrl('');
    setTitle('');
    onClose();
  };

  const busy = upload.isPending || addLink.isPending;

  return (
    <Sheet open={open} onClose={onClose} title="Attach something" size="half">
      <div className="space-y-3">
        {current && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <Paperclip className="h-4 w-4 shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
              {current.title ?? current.kind}
            </span>
            <button
              type="button"
              aria-label="Take it off"
              onClick={() => {
                // The block lets go of it; the file stays with the course.
                // Deleting it from here threw the upload away with one tap and
                // no way back — now one tap puts it back on the block.
                const previous = current;
                onDetach();
                onClose();
                toast.success('Taken off the block', {
                  key: 'media-detached',
                  action: {
                    label: 'Undo',
                    onClick: () => onAttached(previous.id),
                  },
                });
              }}
              className="shrink-0 text-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        <Segmented
          full
          value={mode}
          onChange={(v) => setMode(v as 'file' | 'link')}
          options={[
            { value: 'file', label: 'A file' },
            { value: 'link', label: 'A link' },
          ]}
        />

        <Field label="Call it" hint="What he'll see">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Worksheet — the six cases"
          />
        </Field>

        {mode === 'file' ? (
          <FilePickerButton
            // Worksheets and documents, not only images.
            accept="image/*,application/pdf,.doc,.docx,.odt,.rtf,audio/*"
            onPick={(file) => void attach(file)}
            disabled={busy}
            className="w-full"
          >
            {busy ? <Spinner className="h-4 w-4" /> : <Paperclip size={15} />}
            Choose a file
          </FilePickerButton>
        ) : (
          <>
            <Field label="Paste it" hint="A YouTube video, or any link">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtu.be/…"
                autoCapitalize="off"
                spellCheck={false}
              />
            </Field>
            <Button
              full
              onClick={() => void attach()}
              disabled={busy || !url.trim()}
            >
              <Link2 size={15} /> Attach the link
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
