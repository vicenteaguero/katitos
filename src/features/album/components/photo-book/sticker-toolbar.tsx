import {
  ArrowDownToLine,
  ArrowUpToLine,
  Contrast,
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
 */
export function StickerToolbar({
  sticker,
  onFront,
  onBack,
  onToggleFrame,
  onEditText,
  onRemove,
}: {
  sticker: PlacedSticker;
  onFront: () => void;
  onBack: () => void;
  onToggleFrame: () => void;
  onEditText: () => void;
  onRemove: () => void;
}) {
  const isText = sticker.kind === 'text';
  return (
    <div className="pb-toolbar" role="toolbar" aria-label="Sticker">
      <Tool label="Bring to front" onClick={onFront}>
        <ArrowUpToLine className="h-4 w-4" />
      </Tool>
      <Tool label="Send to back" onClick={onBack}>
        <ArrowDownToLine className="h-4 w-4" />
      </Tool>
      {!isText && (
        <Tool
          label={
            sticker.frame === 'polaroid'
              ? 'Take off the film'
              : 'Make a polaroid'
          }
          onClick={onToggleFrame}
          active={sticker.frame === 'polaroid'}
        >
          <Contrast className="h-4 w-4" />
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
