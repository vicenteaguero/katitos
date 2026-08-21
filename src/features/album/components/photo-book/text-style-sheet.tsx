import { useEffect, useState } from 'react';
import { Button, Field, Input, Segmented, Sheet } from '@kernel/ui';
import type { PlacedSticker, StickerFont } from '../../types';

/** How big the words are, as a fraction of the page's width. */
const SIZES = [0.035, 0.048, 0.065, 0.09, 0.13];

/**
 * The words on a sticker, and how they are set.
 *
 * A Sheet rather than more toolbar because this needs the keyboard, and the
 * kernel Sheet is the one thing in the app that handles the iOS keyboard
 * properly. Three faces only — a real font picker is a different app.
 */
export function TextStyleSheet({
  open,
  sticker,
  onClose,
  onSave,
}: {
  open: boolean;
  sticker: PlacedSticker | null;
  onClose: () => void;
  onSave: (patch: {
    caption?: string | null;
    body?: string | null;
    font_family?: StickerFont;
    font_size?: number;
    font_weight?: number;
  }) => void;
}) {
  const isText = sticker?.kind === 'text';
  const [text, setText] = useState('');
  const [font, setFont] = useState<StickerFont>('display');
  const [size, setSize] = useState(0.06);
  const [bold, setBold] = useState(true);

  useEffect(() => {
    if (!sticker) return;
    setText((sticker.kind === 'text' ? sticker.body : sticker.caption) ?? '');
    setFont(sticker.font_family as StickerFont);
    setSize(sticker.font_size);
    setBold(sticker.font_weight >= 600);
  }, [sticker]);

  if (!sticker) return null;

  const save = () => {
    const value = text.trim() || null;
    onSave({
      ...(isText ? { body: value } : { caption: value }),
      font_family: font,
      font_size: size,
      font_weight: bold ? 700 : 400,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isText ? 'The words' : 'Caption'}
      size="half"
    >
      <div className="space-y-3">
        <Field label={isText ? 'Say it' : 'Write under the photo'}>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isText ? 'our first morning' : 'Santorini, June'}
            maxLength={140}
            autoFocus
          />
        </Field>
        <Segmented
          full
          value={font}
          onChange={(v) => setFont(v)}
          options={[
            {
              value: 'display',
              label: <span className="pb-font-display">Aa</span>,
            },
            { value: 'sans', label: <span className="pb-font-sans">Aa</span> },
            { value: 'hand', label: <span className="pb-font-hand">Aa</span> },
          ]}
        />
        <div className="space-y-2">
          <Segmented
            full
            value={String(size)}
            onChange={(v) => setSize(Number(v))}
            options={SIZES.map((s, i) => ({
              value: String(s),
              label: ['XS', 'S', 'M', 'L', 'XL'][i],
            }))}
          />
          {/* Words, not two nearly identical Aa's. At this size the only
              difference between them was a hair of stroke weight, and nobody
              could tell which one they were already on. */}
          {/* Words, not two nearly identical Aa's — at that size the only
              difference was a hair of stroke weight and you could not tell
              which one you were already on. */}
          <Segmented
            full
            value={bold ? 'b' : 'r'}
            onChange={(v) => setBold(v === 'b')}
            options={[
              { value: 'r', label: 'Regular' },
              { value: 'b', label: 'Bold' },
            ]}
          />
        </div>
        <Button full onClick={save}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}
