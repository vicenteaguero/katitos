import { cn } from '../lib/cn';
import { useToastStore, type ToastTone } from './toast';

const tones: Record<ToastTone, string> = {
  info: 'bg-surface-2 text-fg',
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto w-full max-w-app rounded px-4 py-2.5 text-sm font-medium shadow-lg',
            tones[t.tone]
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
