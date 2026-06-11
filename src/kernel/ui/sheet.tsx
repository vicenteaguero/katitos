import { useEffect, type ReactNode } from 'react';

/** A bottom sheet modal (phone-friendly). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
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
      <div className="curtain-reveal velvet-2 gilt-hairline relative z-10 max-h-[85vh] w-full max-w-app overflow-y-auto rounded-none p-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-loge">
        <div className="mx-auto mb-6 h-px w-12 rounded-none bg-border" />
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
