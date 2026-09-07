import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The bar that stays at the bottom while the page scrolls under it: "New
 * lesson", "Give it back", the dictionary's bulk actions.
 *
 * Sticky, not fixed, so it lives inside whatever scrolls (the shell's
 * <main> on a phone, the desk canvas on a laptop) and never overlaps the
 * tab bar, which owns the home-indicator inset. The fade lets the last row
 * show through; `safe` is for a full-screen screen with no tab bar under
 * it. The bar itself lets taps through to the page; only its children
 * catch them.
 *
 * Give the list above `pb-2` (or more) so its last row can scroll clear.
 */
export function StickyFooter({
  children,
  safe = false,
  className,
}: {
  children: ReactNode;
  /** Pad for the home indicator when the tab bar is hidden. */
  safe?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none sticky bottom-0 z-10 -mx-[0.875rem] px-[0.875rem] pb-2 pt-7 [&>*]:pointer-events-auto',
        safe && 'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className
      )}
      style={{
        background: 'linear-gradient(180deg, transparent, var(--color-bg) 40%)',
      }}
    >
      {children}
    </div>
  );
}
