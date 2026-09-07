import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  BookMarked,
  HelpCircle,
  Minus,
  Paperclip,
  Plus,
  Table2,
} from 'lucide-react';
import { Button, Dialog } from '@kernel/ui';
import { ActionGrid, ActionTile } from '../kit';
import type { BlockKind } from '../../types';

/** What can be put in a lesson: five kinds of block, and a question. */
export type InsertKind = BlockKind | 'question';

const KINDS: { kind: InsertKind; label: string; icon: LucideIcon }[] = [
  { kind: 'text', label: 'Text', icon: AlignLeft },
  { kind: 'vocab', label: 'Words', icon: BookMarked },
  { kind: 'question', label: 'Question', icon: HelpCircle },
  { kind: 'table', label: 'Table', icon: Table2 },
  { kind: 'media', label: 'Material', icon: Paperclip },
  { kind: 'divider', label: 'Break', icon: Minus },
];

/** The six tiles, three to a row: the inspector's Insert, and the menu's. */
export function InsertGrid({
  onPick,
  busy = false,
}: {
  onPick: (kind: InsertKind) => void;
  busy?: boolean;
}) {
  return (
    <ActionGrid cols={3}>
      {KINDS.map((k) => (
        <ActionTile
          key={k.kind}
          icon={<k.icon className="h-4 w-4" />}
          label={k.label}
          disabled={busy && k.kind !== 'question'}
          onClick={() => onPick(k.kind)}
        />
      ))}
    </ActionGrid>
  );
}

/** The menu that "+ Insert here" opens. */
export function InsertMenu({
  open,
  onClose,
  onPick,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: InsertKind) => void;
  busy?: boolean;
}) {
  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="Insert"
      size="sm"
    >
      <div className="pb-1">
        <InsertGrid
          busy={busy}
          onPick={(k) => {
            onPick(k);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

/** The seam between two blocks, with the one pill that opens the menu. */
export function InsertHere({
  onClick,
  label = 'Insert here',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px flex-1 bg-fg/[0.07]" />
      <Button
        variant="outline"
        size="xs"
        onClick={onClick}
        className="h-7 rounded-full bg-surface px-3 text-xs"
      >
        <Plus className="h-3 w-3" /> {label}
      </Button>
      <span className="h-px flex-1 bg-fg/[0.07]" />
    </div>
  );
}
