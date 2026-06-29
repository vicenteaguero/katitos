import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@kernel/lib';

/**
 * THE bottom-sheet modal for the whole app — one component, one behaviour. The
 * overlay is sized to the VISIBLE viewport (`visualViewport`), so when the
 * keyboard opens the sheet simply sits in the shrunken visible area above it —
 * no input is ever covered, on a short sheet or a tall one. Don't hand-roll
 * modals elsewhere; use this.
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
  // The visible viewport (top offset + height). Tracks the keyboard via
  // `visualViewport`; null until measured / when unsupported (→ full screen).
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const sync = () => {
      if (vv) setVp({ top: vv.offsetTop, height: vv.height });
    };
    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      setVp(null);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so the sheet is a true overlay even when the open trigger
  // lives inside a transformed ancestor (a `.curtain-reveal` route would
  // otherwise confine this fixed layer to the content box).
  return createPortal(
    <div
      className="fixed left-0 right-0 z-50 flex items-end justify-center"
      style={vp ? { top: vp.top, height: vp.height } : { top: 0, bottom: 0 }}
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
          size === 'half' ? 'max-h-[60%]' : 'max-h-[94%]'
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
        {/* The body scrolls within the visible area. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
