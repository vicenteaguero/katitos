import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import {
  Button,
  CameraCapture,
  Field,
  FilePickerButton,
  Input,
  Sheet,
  toast,
} from '@kernel/ui';
import { useStickSticker } from '../api/album.mutations';
import type { AlbumSlot, StickerHalf } from '../types';

export function FillSheet({
  open,
  onClose,
  slot,
  half,
  selfName,
}: {
  open: boolean;
  onClose: () => void;
  slot: AlbumSlot | null;
  /** Which half to fill: 'solo' for non-duo, else the current user's half. */
  half: StickerHalf;
  selfName: string;
}) {
  const stick = useStickSticker();
  const [cam, setCam] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setBlob(null);
      setCaption('');
      setLocation('');
      setCam(false);
    }
  }, [open]);

  const submit = () => {
    if (!slot || !blob) return;
    stick.mutate(
      {
        chapterId: slot.chapter_id,
        slotId: slot.id,
        half,
        blob,
        caption: caption.trim() || null,
        location: location.trim() || null,
        slotTitle: slot.title,
        selfName,
      },
      {
        onSuccess: () => {
          toast.success('Stuck it in 📖');
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={slot?.title ?? 'Add sticker'}>
        <div className="space-y-3">
          {slot?.is_duo && (
            <p className="text-xs text-muted">
              This is a duo slot — you're filling your half ({half}).
            </p>
          )}

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="preview"
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex gap-2">
              <Button full variant="secondary" onClick={() => setCam(true)}>
                <Camera size={16} /> Take photo
              </Button>
              <FilePickerButton onPick={(file) => setBlob(file)}>
                Upload
              </FilePickerButton>
            </div>
          )}

          {blob && (
            <>
              <Field label="Caption">
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening?"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where?"
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setBlob(null)}
                  disabled={stick.isPending}
                >
                  Retake
                </Button>
                <Button full onClick={submit} disabled={stick.isPending}>
                  {stick.isPending ? 'Sticking…' : 'Stick it'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Sheet>

      {cam && (
        <CameraCapture
          facingMode="environment"
          onCapture={(b) => {
            setBlob(b);
            setCam(false);
          }}
          onCancel={() => setCam(false)}
        />
      )}
    </>
  );
}
