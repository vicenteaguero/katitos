import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  BookMarked,
  HelpCircle,
  Minus,
  Paperclip,
  Table2,
} from 'lucide-react';
import { Button } from '@kernel/ui';
import type { BlockKind } from '../../types';

const BLOCKS: { kind: BlockKind; label: string; icon: LucideIcon }[] = [
  { kind: 'text', label: 'text', icon: AlignLeft },
  { kind: 'vocab', label: 'words', icon: BookMarked },
  { kind: 'table', label: 'table', icon: Table2 },
  { kind: 'media', label: 'material', icon: Paperclip },
  { kind: 'divider', label: 'break', icon: Minus },
];

/** What a lesson can be made of - one control per kind, plus a question. */
export function BlockPalette({
  onAdd,
  onQuestion,
  busy = false,
}: {
  onAdd: (kind: BlockKind) => void;
  onQuestion: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BLOCKS.map((b) => (
        <Button
          key={b.kind}
          size="xs"
          variant="secondary"
          disabled={busy}
          onClick={() => onAdd(b.kind)}
        >
          <b.icon size={13} /> {b.label}
        </Button>
      ))}
      <Button size="xs" variant="secondary" onClick={onQuestion}>
        <HelpCircle size={13} /> question
      </Button>
    </div>
  );
}
