import { useRef } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { useConfirmStore, type Pending } from './confirm';

/** Renders the one confirm dialog for the whole app. Mount once, in the shell. */
export function ConfirmHost() {
  const pending = useConfirmStore((s) => s.pending);
  const settle = useConfirmStore((s) => s.settle);
  // The last question stays on screen while the dialog animates out.
  const last = useRef<Pending | null>(null);
  if (pending) last.current = pending;
  const shown = pending ?? last.current;

  return (
    <Dialog
      open={!!pending}
      onClose={() => settle(false)}
      placement="auto"
      size="sm"
      title={shown?.title ?? ''}
    >
      {shown?.body && (
        <p className="mb-3 font-sans text-sm leading-relaxed text-fg/90">
          {shown.body}
        </p>
      )}
      <div className="flex gap-2">
        <Button full variant="secondary" onClick={() => settle(false)}>
          {shown?.cancelLabel ?? 'Keep it'}
        </Button>
        <Button
          full
          variant={shown?.danger ? 'danger' : 'primary'}
          onClick={() => settle(true)}
          autoFocus
        >
          {shown?.confirmLabel ?? 'Yes'}
        </Button>
      </div>
    </Dialog>
  );
}
