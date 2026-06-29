import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@kernel/lib';

/**
 * THE bottom-sheet modal for the whole app — one component, one behaviour.
 *
 * Keyboard handling: the panel stays ANCHORED to the screen bottom (its
 * surface fills all the way down, behind the keyboard), and only the scrolling
 * BODY gets extra bottom padding equal to the keyboard height — so the content
 * lifts above the keyboard while the background still reaches the bottom edge.
 * (It expands, it doesn't translate up leaving a cut + black strip.) Don't
 * hand-roll modals elsewhere; use this.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  size = 'full',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'full' | 'half';
}) {
  // On-screen keyboard height (iOS visualViewport). 0 when closed/unsupported.
  const [kb, setKb] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return;
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setKb(overlap > 80 ? overlap : 0);
    };
    sync();
    // The keyboard opens from a field's autoFocus DURING mount — its first
    // visualViewport `resize` can fire before this listener is attached, so the
    // very first open would miss it (and only catch up on a later keyboard
    // toggle). Re-sync a few times right after open to catch that first one.
    const polls = [120, 320, 600, 900].map((d) => window.setTimeout(sync, d));
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      polls.forEach((t) => window.clearTimeout(t));
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      setKb(0);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so the sheet is a true overlay even when the open trigger
  // lives inside a transformed ancestor (a `.curtain-reveal` route would
  // otherwise confine this fixed layer to the content box).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        className={cn(
          'curtain-reveal relative z-10 flex w-full max-w-app flex-col overflow-x-hidden rounded-t-[1.75rem] border-t border-[rgba(228,195,106,0.3)] bg-surface-2 shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.7)]',
          size === 'half' ? 'max-h-[64vh]' : 'max-h-[94vh]'
        )}
      >
        {/* Pinned header — grip + title + Close — never scrolls away. */}
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full bg-fg/20" />
          <div className="mb-4 flex items-center justify-between gap-3">
            {title ? (
              <h2 className="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-fg">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="lift-press shrink-0 rounded-full bg-surface px-3.5 py-1.5 font-sans text-xs font-semibold text-fg/80 shadow-[inset_0_0_0_1px_rgba(228,195,106,0.22)] active:text-fg"
            >
              Close
            </button>
          </div>
        </div>
        {/* The body scrolls; its bottom padding grows with the keyboard so the
            content clears it while the panel's surface still fills to the edge. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 transition-[padding] duration-200"
          style={{
            paddingBottom: kb
              ? `${kb + 20}px`
              : 'max(1.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
