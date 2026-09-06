import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Link2,
  Music,
  Paperclip,
  Trash2,
  Youtube,
} from 'lucide-react';
import {
  Button,
  Dialog,
  Field,
  FilePickerButton,
  Input,
  Segmented,
  Spinner,
  toast,
} from '@kernel/ui';
import { useAddLink, useCourseMedia, useUploadMedia } from '../api/media';
import type { Media } from '../types';

/**
 * Give a media block something to show.
 *
 * A worksheet, a photograph, or a video - the three things she actually hands
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
  const [mode, setMode] = useState<'file' | 'link' | 'library'>('file');
  const { data: library } = useCourseMedia(courseId);
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
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="Attach something"
      size="md"
    >
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
                // no way back - now one tap puts it back on the block.
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
          onChange={(v) => setMode(v as 'file' | 'link' | 'library')}
          label="Where from"
          options={[
            { value: 'file', label: 'A file' },
            { value: 'link', label: 'A link' },
            { value: 'library', label: 'Already here' },
          ]}
        />

        {mode !== 'library' && (
          <Field label="Call it" hint="What he'll see">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Worksheet - the six cases"
            />
          </Field>
        )}

        {mode === 'library' ? (
          // Everything ever attached in this course: a worksheet uploaded for
          // lesson 3 is one tap away in lesson 9.
          <ul className="max-h-72 divide-y divide-fg/5 overflow-y-auto rounded-lg bg-surface px-3">
            {(library ?? [])
              .filter((m) => m.id !== current?.id)
              .map((m) => {
                const Icon =
                  m.kind === 'image'
                    ? ImageIcon
                    : m.kind === 'audio'
                      ? Music
                      : m.kind === 'youtube'
                        ? Youtube
                        : m.kind === 'link'
                          ? Link2
                          : FileText;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onAttached(m.id);
                        onClose();
                      }}
                      className="flex w-full items-center gap-2 py-2 text-left hover:bg-fg/5"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-gold" />
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
                        {m.title ?? m.url ?? m.kind}
                      </span>
                    </button>
                  </li>
                );
              })}
            {(library ?? []).filter((m) => m.id !== current?.id).length ===
              0 && (
              <li className="py-3 font-sans text-xs text-muted">
                Nothing in this course yet.
              </li>
            )}
          </ul>
        ) : mode === 'file' ? (
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
    </Dialog>
  );
}
