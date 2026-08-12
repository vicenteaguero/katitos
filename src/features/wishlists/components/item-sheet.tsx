import { useEffect, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Trash2 } from 'lucide-react';
import {
  Button,
  Field,
  FilePickerButton,
  IconButton,
  Input,
  Select,
  Sheet,
  SquareCropper,
  Textarea,
} from '@kernel/ui';
import { CURRENCIES } from '@kernel/lib';
import type { WishlistItem } from '../types';

export interface ItemDraft {
  title: string;
  description: string;
  link: string;
  price: string;
  currency: string;
  visible: boolean;
  image: Blob | null;
}

const EMPTY: ItemDraft = {
  title: '',
  description: '',
  link: '',
  price: '',
  currency: 'CLP',
  // HIDDEN BY DEFAULT. A gift list exists to keep surprises, so the safe
  // default is the one that keeps them.
  visible: false,
  image: null,
};

/**
 * Add or edit one wish.
 *
 * Deliberately one screen with everything on it — the fastest possible path
 * from "I saw a thing" to it being saved.
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
  const [cropping, setCropping] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Reset every time the sheet opens, so a half-typed wish never leaks into
  // the next one.
  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            title: editing.title,
            description: editing.description ?? '',
            link: editing.link ?? '',
            price: editing.price != null ? String(editing.price) : '',
            currency: editing.currency ?? 'CLP',
            visible: editing.visible,
            image: null,
          }
        : EMPTY
    );
    setPreview(null);
  }, [open, editing]);

  useEffect(() => {
    if (!draft.image) return;
    const url = URL.createObjectURL(draft.image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.image]);

  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
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
          <Field label="What is it?">
            <Input
              autoFocus={!editing}
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="that ridiculous lamp"
            />
          </Field>

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
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-fg">
                {draft.visible ? 'Visible to both of us' : 'Hidden — just you'}
              </span>
              <span className="block font-sans text-xs text-muted">
                {draft.visible
                  ? 'Tap to keep it a surprise'
                  : 'Your love will never see this one'}
              </span>
            </span>
          </button>

          <Field label="Anything about it?">
            <Textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="size, colour, why…"
            />
          </Field>

          <Field label="Link">
            <Input
              type="url"
              inputMode="url"
              value={draft.link}
              onChange={(e) => set('link', e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="About how much?">
              <Input
                inputMode="decimal"
                value={draft.price}
                onChange={(e) =>
                  set('price', e.target.value.replace(/[^\d.]/g, ''))
                }
                placeholder="—"
              />
            </Field>
            <Field label="In">
              <Select
                value={draft.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="A picture">
            <div className="flex items-center gap-3">
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : editing?.image_path ? (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-sans text-[0.6rem] text-muted">
                  current
                </span>
              ) : null}
              <FilePickerButton
                onPick={(file) => setCropping(file)}
                className="flex-1 justify-center"
              >
                <ImagePlus className="h-4 w-4" />
                {preview ? 'Change picture' : 'Add a picture'}
              </FilePickerButton>
            </div>
          </Field>

          <Button
            full
            onClick={() => onSubmit(draft)}
            disabled={!draft.title.trim() || submitting}
          >
            {editing ? 'Save' : 'Add to the list'}
          </Button>
        </div>
      </Sheet>

      {cropping && (
        <SquareCropper
          file={cropping}
          confirmLabel="Use this"
          onCancel={() => setCropping(null)}
          onCropped={(blob) => {
            set('image', blob);
            setCropping(null);
          }}
        />
      )}
    </>
  );
}
