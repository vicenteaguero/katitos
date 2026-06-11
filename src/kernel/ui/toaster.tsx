import { cn } from '../lib/cn';
import { useToastStore, type ToastTone } from './toast';

const tones: Record<ToastTone, string> = {
  info: 'velvet-2 text-fg',
  success: 'bg-success text-accent-fg',
  error: 'bg-danger text-accent-fg',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-stage z-[60] flex flex-col items-center gap-3 px-stage">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'curtain-reveal gilt-hairline pointer-events-auto w-full max-w-app rounded-none px-5 py-3.5 text-left font-sans text-sm font-semibold tracking-[0.02em] shadow-loge',
            tones[t.tone]
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
