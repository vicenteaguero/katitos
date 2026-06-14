import { Check, TriangleAlert, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { useToastStore, type ToastTone } from './toast';

// One quiet wine pill for all toasts; the tone lives in a small icon chip so a
// "saved" ping reads instantly without shouting. Mini, centered, gilt-edged.
const toneIcon: Record<ToastTone, LucideIcon> = {
  info: Sparkles,
  success: Check,
  error: TriangleAlert,
};

const toneChip: Record<ToastTone, string> = {
  info: 'bg-gold text-bg',
  success: 'bg-success text-accent-fg',
  error: 'bg-danger text-accent-fg',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-stage z-[60] flex flex-col items-center gap-2 px-stage">
      {toasts.map((t) => {
        const Icon = toneIcon[t.tone];
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="curtain-reveal pointer-events-auto inline-flex max-w-app items-center gap-2.5 rounded-full bg-surface-2/95 py-2 pl-2 pr-4 text-left font-sans text-[0.84rem] font-medium tracking-[0.01em] text-fg shadow-loge backdrop-blur-md"
            style={{ border: '1px solid rgba(201,162,75,.24)' }}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                toneChip[t.tone]
              )}
            >
              <Icon size={13} strokeWidth={2.75} />
            </span>
            <span className="min-w-0">{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
