import { useEffect, type ReactNode } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
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
        className={cn(
          'curtain-reveal relative z-10 w-full max-w-app overflow-y-auto rounded-t-[1.75rem] border-t border-[rgba(228,195,106,0.3)] bg-surface-2 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.7)]',
          size === 'half' ? 'max-h-[60vh]' : 'max-h-[88vh]'
        )}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-fg/20" />
        {title && (
          <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight text-fg">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
