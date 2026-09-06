import { useEffect, useState } from 'react';
import { Eye, EyeOff, Link2, Trash2, X } from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  PhotoPicker,
  Sheet,
  Textarea,
} from '@kernel/ui';
import type { WishlistItem } from '../types';

export interface ItemDraft {
  title: string;
  description: string;
  link: string;
  visible: boolean;
  image: Blob | null;
}

const EMPTY: ItemDraft = {
  title: '',
  description: '',
  link: '',
  // HIDDEN BY DEFAULT. A gift list exists to keep surprises, so the safe
  // default is the one that keeps them.
  visible: false,
  image: null,
};

/**
 * Add or edit one wish. Name, eye, picture, link, then a note - the order you
 * think of them in.
 *
 * No field labels: the placeholders already say what each one is, and a stack
 * of uppercase captions over four inputs reads like a form to fill in rather
 * than a thing you want.
 */
export function ItemSheet({
  open,
  onClose,
  editing,
  onSubmit,
  onDelete,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing wish. */
  editing?: WishlistItem | null;
  onSubmit: (draft: ItemDraft) => void;
  onDelete?: () => void;
  submitting?: boolean;
}) {
  const [draft, setDraft] = useState<ItemDraft>(EMPTY);
  const [pasteFailed, setPasteFailed] = useState(false);

  // Reset every time the sheet opens, so a half-typed wish never leaks into
  // the next one.
  useEffect(() => {
    if (!open) return;
    setPasteFailed(false);
    setDraft(
      editing
        ? {
            title: editing.title,
            description: editing.description ?? '',
            link: editing.link ?? '',
            visible: editing.visible,
            image: null,
          }
        : EMPTY
    );
  }, [open, editing]);

  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /**
   * Links get pasted, never typed - you found the thing in a browser and came
   * here with it already on the clipboard. Falls back to a plain field if the
   * browser refuses clipboard access.
   */
  const pasteLink = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) set('link', text);
      else setPasteFailed(true);
    } catch {
      setPasteFailed(true);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit this wish' : 'A new wish'}
      headerAction={
        onDelete && editing ? (
          <IconButton label="Delete" onClick={onDelete} className="h-9 w-9">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <Input
          autoFocus={!editing}
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What do you want?"
          className="font-display text-lg"
        />

        {/* The eye. Closed = only you can see it. */}
        <button
          type="button"
          onClick={() => set('visible', !draft.visible)}
          aria-pressed={!draft.visible}
          className="lift-press flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left"
        >
          <span
            className={
              draft.visible
                ? 'flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted'
                : 'flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-fg'
            }
          >
            {draft.visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1 font-sans text-sm font-semibold text-fg">
            {draft.visible ? 'Both of us can see it' : 'Hidden - only you'}
          </span>
        </button>

        <PhotoPicker
          value={draft.image}
          onChange={(blob) => set('image', blob)}
        />

        {draft.link ? (
          <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3">
            <Link2 className="h-4 w-4 shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
              {draft.link}
            </span>
            <button
              type="button"
              onClick={() => set('link', '')}
              aria-label="Remove link"
              className="lift-press shrink-0 text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : pasteFailed ? (
          <Input
            autoFocus
            type="url"
            inputMode="url"
            value={draft.link}
            onChange={(e) => set('link', e.target.value)}
            placeholder="Paste the link here"
          />
        ) : (
          <Button variant="secondary" full onClick={() => void pasteLink()}>
            <Link2 className="h-4 w-4" /> Paste link
          </Button>
        )}

        <Textarea
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          placeholder="Size, colour, why you want it…"
        />

        <Button
          full
          onClick={() => onSubmit(draft)}
          disabled={!draft.title.trim() || submitting}
        >
          {editing ? 'Save' : 'Add to the list'}
        </Button>
      </div>
    </Sheet>
  );
}
