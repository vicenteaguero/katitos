import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@kernel/lib';

/** A bottom sheet modal (phone-friendly). `size="half"` is short + easy to dismiss. */
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
  // How much the on-screen keyboard eats — so we can lift the sheet above it
  // instead of letting it cover the inputs/buttons (iOS visualViewport).
  const [kb, setKb] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const onViewport = () => {
      if (!vv) return;
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setKb(overlap > 60 ? overlap : 0);
    };
    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', onViewport);
    onViewport();

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', onViewport);
      setKb(0);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so the sheet is a true full-screen overlay, even when the
  // open trigger lives inside a transformed ancestor (a `.curtain-reveal` route
  // would otherwise confine this fixed layer to the content box).
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
        style={{ marginBottom: kb }}
        className={cn(
          'curtain-reveal relative z-10 w-full max-w-app overflow-y-auto overflow-x-hidden rounded-t-[1.75rem] border-t border-[rgba(228,195,106,0.3)] bg-surface-2 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.7)] transition-[margin] duration-200',
          size === 'half' ? 'max-h-[60vh]' : 'max-h-[88vh]'
        )}
      >
        <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full bg-fg/20" />
        {/* Title left · always-present Close pill right (distinct, highlighted). */}
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
        {children}
      </div>
    </div>,
    document.body
  );
}
