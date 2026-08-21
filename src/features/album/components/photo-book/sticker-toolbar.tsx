import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  Crop,
  Palette,
  Trash2,
  Type,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import type { PlacedSticker } from '../../types';

/**
 * What you can do to the sticker you just tapped.
 *
 * A bar, not a Sheet: it stands in for the nav row rather than sitting on top
 * of it, so it costs no height at all — and it never covers the page you are
 * arranging, which a bottom sheet always would.
 *
 * While cropping it becomes a single Done, because there is exactly one thing
 * to do with a picture you are moving inside its frame, and a row of tools you
 * must not press is worse than no row at all.
 */
export function StickerToolbar({
  sticker,
  cropping,
  onFront,
  onBack,
  onCrop,
  onStyle,
  onEditText,
  onRemove,
}: {
  sticker: PlacedSticker;
  cropping: boolean;
  onFront: () => void;
  onBack: () => void;
  onCrop: () => void;
  onStyle: () => void;
  onEditText: () => void;
  onRemove: () => void;
}) {
  const isText = sticker.kind === 'text';

  if (cropping) {
    return (
      <div className="pb-toolbar" role="toolbar" aria-label="Cropping">
        <span className="pb-toolbar-note">
          Drag the picture · pinch to come closer
        </span>
        <Tool label="Done cropping" onClick={onCrop} active>
          <Check className="h-4 w-4" />
        </Tool>
      </div>
    );
  }

  return (
    <div className="pb-toolbar" role="toolbar" aria-label="Sticker">
      <Tool label="Bring to front" onClick={onFront}>
        <ArrowUpToLine className="h-4 w-4" />
      </Tool>
      <Tool label="Send to back" onClick={onBack}>
        <ArrowDownToLine className="h-4 w-4" />
      </Tool>
      {!isText && (
        <Tool label="Move the picture in its frame" onClick={onCrop}>
          <Crop className="h-4 w-4" />
        </Tool>
      )}
      {!isText && (
        <Tool label="Shape, mount and colour" onClick={onStyle}>
          <Palette className="h-4 w-4" />
        </Tool>
      )}
      <Tool
        label={isText ? 'Edit the words' : 'Caption and style'}
        onClick={onEditText}
      >
        <Type className="h-4 w-4" />
      </Tool>
      <Tool label="Take off the page" onClick={onRemove} danger>
        <Trash2 className="h-4 w-4" />
      </Tool>
    </div>
  );
}

function Tool({
  label,
  onClick,
  children,
  active,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'lift-press flex h-11 flex-1 items-center justify-center rounded-lg transition',
        active && 'bg-accent text-accent-fg',
        danger ? 'text-danger' : !active && 'text-fg/80'
      )}
    >
      {children}
    </button>
  );
}
