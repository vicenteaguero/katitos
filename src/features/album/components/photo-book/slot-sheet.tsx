import { useState } from 'react';
import { Camera, ImagePlus, Sparkles, Trash2 } from 'lucide-react';
import {
  Button,
  CameraCapture,
  Field,
  FilePickerButton,
  Input,
  Sheet,
  Spinner,
  toast,
} from '@kernel/ui';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import type { Tables } from '@kernel/supabase';
import type { AlbumPhoto, PhotoSource } from '../../types';
import {
  useAddPhoto,
  useRemovePhoto,
  useSetPhotoCaption,
} from '../../api/photo-book.mutations';
import { usePolaroidPicker } from '../../api/photo-book.queries';
import { SlotPhoto } from './slot-photo';

type Polaroid = Tables<'polaroids'>;

/** Add a new photo to an empty slot, or edit/replace/remove an existing one. */
export function SlotSheet({
  bookId,
  pageId,
  slot,
  photo,
  onClose,
}: {
  bookId: string;
  pageId: string;
  slot: number;
  photo: AlbumPhoto | undefined;
  onClose: () => void;
}) {
  const editing = !!photo?.image_path;
  const [caption, setCaption] = useState(photo?.caption ?? '');
  const [view, setView] = useState<'menu' | 'polaroids'>('menu');
  const [camera, setCamera] = useState(false);

  const add = useAddPhoto();
  const setCap = useSetPhotoCaption();
  const remove = useRemovePhoto();
  const busy = add.isPending || setCap.isPending || remove.isPending;

  async function addUpload(blob: Blob) {
    setCamera(false);
    try {
      await add.mutateAsync({
        bookId,
        pageId,
        slot,
        source: 'upload',
        blob,
        caption: caption.trim() || null,
      });
      toast.success(editing ? 'Photo replaced' : 'Photo added');
      onClose();
    } catch {
      toast.error('Could not add the photo');
    }
  }

  async function addPolaroid(p: Polaroid) {
    try {
      await add.mutateAsync({
        bookId,
        pageId,
        slot,
        source: 'polaroid',
        polaroidPath: p.image_path,
        caption: caption.trim() || p.caption || null,
      });
      toast.success('Polaroid added');
      onClose();
    } catch {
      toast.error('Could not add the polaroid');
    }
  }

  async function saveCaption() {
    if (!photo) return;
    try {
      await setCap.mutateAsync({ id: photo.id, bookId, caption });
      toast.success('Caption saved');
      onClose();
    } catch {
      toast.error('Could not save the caption');
    }
  }

  async function removePhoto() {
    if (!photo) return;
    try {
      await remove.mutateAsync({
        id: photo.id,
        bookId,
        source: photo.source as PhotoSource,
        path: photo.image_path,
      });
      toast.success('Photo removed');
      onClose();
    } catch {
      toast.error('Could not remove the photo');
    }
  }

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={
          view === 'polaroids'
            ? 'Pick a polaroid'
            : editing
              ? 'Edit photo'
              : 'Add a photo'
        }
      >
        {view === 'polaroids' ? (
          <PolaroidPicker onPick={addPolaroid} onBack={() => setView('menu')} />
        ) : (
          <div className="space-y-6">
            {editing && photo && (
              <div className="relative mx-auto aspect-square w-44 overflow-hidden rounded-xl">
                <SlotPhoto
                  source={photo.source as PhotoSource}
                  path={photo.image_path}
                  alt={photo.caption ?? 'Album photo'}
                />
              </div>
            )}

            <Field label="Caption" hint="A line for this memory (optional).">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something sweet…"
                maxLength={120}
              />
            </Field>

            {editing ? (
              <div className="space-y-3">
                <Button full onClick={saveCaption} disabled={busy}>
                  {setCap.isPending ? <Spinner /> : null} Save caption
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setCamera(true)}
                    disabled={busy}
                  >
                    <Camera size={18} /> Replace
                  </Button>
                  <Button
                    variant="danger"
                    onClick={removePhoto}
                    disabled={busy}
                  >
                    <Trash2 size={18} /> Remove
                  </Button>
                </div>
                <FilePickerButton
                  onPick={(f) => void addUpload(f)}
                  disabled={busy}
                  className="w-full"
                >
                  <ImagePlus size={18} /> Replace from library
                </FilePickerButton>
              </div>
            ) : (
              <div className="space-y-3">
                <Button full onClick={() => setCamera(true)} disabled={busy}>
                  <Camera size={18} /> Take a photo
                </Button>
                <FilePickerButton
                  onPick={(f) => void addUpload(f)}
                  disabled={busy}
                  className="w-full"
                >
                  <ImagePlus size={18} /> Upload from phone
                </FilePickerButton>
                <Button
                  variant="secondary"
                  full
                  onClick={() => setView('polaroids')}
                  disabled={busy}
                >
                  <Sparkles size={18} /> Add a polaroid
                </Button>
                {busy && (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted">
                    <Spinner /> Adding…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>

      {camera && (
        <CameraCapture
          onCapture={(blob) => void addUpload(blob)}
          onCancel={() => setCamera(false)}
        />
      )}
    </>
  );
}

/** Grid of existing daily polaroids to drop straight into a page slot. */
function PolaroidPicker({
  onPick,
  onBack,
}: {
  onPick: (p: Polaroid) => void;
  onBack: () => void;
}) {
  const { data: polaroids, isLoading } = usePolaroidPicker(true);

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : polaroids && polaroids.length > 0 ? (
        <div className="grid max-h-[52vh] grid-cols-3 gap-2 overflow-y-auto">
          {polaroids.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 transition active:scale-95"
            >
              <PolaroidThumb path={p.image_path} />
            </button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          No polaroids yet — take a daily one first.
        </p>
      )}
      <Button variant="ghost" full onClick={onBack}>
        Back
      </Button>
    </div>
  );
}

function PolaroidThumb({ path }: { path: string }) {
  const { proxyUrl, fullUrl } = useProxiedUrl(BUCKETS.polaroids, path);
  const src = proxyUrl ?? fullUrl;
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Polaroid"
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
