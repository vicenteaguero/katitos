import { cn } from '@kernel/lib';
import { usePartnerPresence } from '../hooks/use-partner-presence';

export function PartnerStatusDot({ className }: { className?: string }) {
  const { partner, online } = usePartnerPresence();
  if (!partner) return null;
  return (
    <span
      title={online ? 'online' : 'offline'}
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        online
          ? 'candle-flicker bg-purple shadow-[0_0_6px_1px_rgba(44,138,94,0.6)]'
          : 'bg-muted',
        className
      )}
    />
  );
}
