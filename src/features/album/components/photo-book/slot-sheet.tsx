import { useState } from 'react';
import { Camera, ImagePlus, Sparkles } from 'lucide-react';
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
import { useAddPhoto } from '../../api/photo-book.mutations';
import { usePolaroidPicker } from '../../api/photo-book.queries';

type Polaroid = Tables<'polaroids'>;

/**
 * Add a NEW photo to the page — camera, library, or a daily polaroid. Its
 * caption is set HERE, once, when you add it (it can't be changed afterwards);
 * once placed, you drag the sticker around the page.
 */
export function SlotSheet({
  bookId,
  pageId,
  slot,
  onClose,
}: {
  bookId: string;
  pageId: string;
  slot: number;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState('');
  const [view, setView] = useState<'menu' | 'polaroids'>('menu');
  const [camera, setCamera] = useState(false);

  const add = useAddPhoto();
  const busy = add.isPending;

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
      toast.success('Photo added');
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

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={view === 'polaroids' ? 'Pick a polaroid' : 'Add a photo'}
      >
        {view === 'polaroids' ? (
          <PolaroidPicker onPick={addPolaroid} onBack={() => setView('menu')} />
        ) : (
          <div className="space-y-5">
            <Field label="Caption" hint="Set it now — it stays with the photo.">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something sweet…"
                maxLength={120}
                autoFocus
              />
            </Field>
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

/** Grid of existing daily polaroids to drop straight onto the page. */
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
