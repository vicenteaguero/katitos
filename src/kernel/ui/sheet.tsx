import { useEffect, type ReactNode } from 'react';
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

  return (
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
          'curtain-reveal relative z-10 w-full max-w-app overflow-y-auto rounded-t-xl bg-surface-2 p-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-loge',
          size === 'half' ? 'max-h-[52vh]' : 'max-h-[85vh]'
        )}
      >
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-fg/15" />
        {title && (
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight text-fg">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
