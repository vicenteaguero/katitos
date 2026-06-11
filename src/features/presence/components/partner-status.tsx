import { cn } from '@kernel/lib';
import { usePartnerPresence } from '../hooks/use-partner-presence';

export function PartnerStatusDot({ className }: { className?: string }) {
  const { partner, online } = usePartnerPresence();
  if (!partner) return null;
  return (
    <span
      title={online ? 'online' : 'offline'}
      className={cn(
        'inline-block h-2 w-2 rounded-none',
        online ? 'candle-flicker bg-purple' : 'bg-muted',
        className
      )}
    />
  );
}
