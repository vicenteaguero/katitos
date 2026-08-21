import { cn } from '@kernel/lib';
import { Sheet } from '@kernel/ui';
import type {
  FrameColor,
  PlacedSticker,
  StickerFrame,
  StickerShape,
} from '../../types';
import type { StickerStyle } from '../../api/placements.mutations';

const SHAPES: { value: StickerShape; label: string }[] = [
  { value: 'natural', label: 'As it is' },
  { value: 'rounded', label: 'Soft' },
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Round' },
  { value: 'arch', label: 'Arch' },
  { value: 'heart', label: 'Heart' },
  { value: 'torn', label: 'Torn' },
];

const FRAMES: { value: StickerFrame; label: string }[] = [
  { value: 'none', label: 'Bare' },
  { value: 'white', label: 'Mounted' },
  { value: 'polaroid', label: 'Film' },
  { value: 'gilt', label: 'Gilt' },
  { value: 'tape', label: 'Taped' },
  { value: 'shadow', label: 'Lifted' },
];

const COLORS: { value: FrameColor; label: string }[] = [
  { value: 'cream', label: 'Cream' },
  { value: 'white', label: 'White' },
  { value: 'gold', label: 'Gold' },
  { value: 'wine', label: 'Wine' },
  { value: 'ink', label: 'Ink' },
  { value: 'kraft', label: 'Kraft' },
];

/**
 * How a photograph is dressed: what it is cut into, what it is mounted on, and
 * what colour that mount is.
 *
 * Every choice is shown AS ITSELF — a little version of the photo you have
 * selected, wearing that shape and that mount — rather than as an icon of a
 * circle. Nobody can picture "arch" from a word, and this is a sheet about
 * looking at things.
 */
export function StickerStyleSheet({
  open,
  sticker,
  url,
  onClose,
  onChange,
}: {
  open: boolean;
  sticker: PlacedSticker | null;
  url?: string;
  onClose: () => void;
  onChange: (patch: StickerStyle) => void;
}) {
  if (!sticker || sticker.kind === 'text') return null;
  const shape = (sticker.shape as StickerShape) ?? 'natural';
  const frame = (sticker.frame as StickerFrame) ?? 'plain';
  const color = (sticker.frame_color as FrameColor) ?? 'cream';

  return (
    <Sheet open={open} onClose={onClose} title="This photo" size="half">
      <div className="space-y-3">
        <Row label="Cut">
          {SHAPES.map((s) => (
            <Swatch
              key={s.value}
              label={s.label}
              on={shape === s.value}
              onClick={() => onChange({ shape: s.value })}
            >
              <span
                className={cn('pb-swatch-photo', `pb-shape-${s.value}`)}
                style={url ? { backgroundImage: `url(${url})` } : undefined}
              />
            </Swatch>
          ))}
        </Row>

        <Row label="Mount">
          {FRAMES.map((f) => (
            <Swatch
              key={f.value}
              label={f.label}
              on={
                frame === f.value || (f.value === 'white' && frame === 'plain')
              }
              onClick={() => onChange({ frame: f.value })}
            >
              <span
                className={cn(
                  'pb-swatch-frame',
                  `pb-frame-${f.value}`,
                  `pb-mount-${color}`
                )}
              >
                <span
                  className="pb-swatch-photo"
                  style={url ? { backgroundImage: `url(${url})` } : undefined}
                />
              </span>
            </Swatch>
          ))}
        </Row>

        <Row label="Mount colour">
          {COLORS.map((c) => (
            <Swatch
              key={c.value}
              label={c.label}
              on={color === c.value}
              onClick={() => onChange({ frame_color: c.value })}
            >
              <span className={cn('pb-swatch-color', `pb-mount-${c.value}`)} />
            </Swatch>
          ))}
        </Row>
      </div>
    </Sheet>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function Swatch({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={cn('pb-swatch', on && 'pb-swatch--on')}
    >
      {children}
      <span className="pb-swatch-label">{label}</span>
    </button>
  );
}
