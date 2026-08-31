import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Where the panel sits. `bottom` is the phone sheet; `center` a desk modal;
 * `auto` is the sheet on a phone and the modal from a tablet up.
 */
export type DialogPlacement = 'bottom' | 'center' | 'auto';

/**
 * How big. `half` and `full` are the two sheet heights the app has always
 * had; `sm`/`md`/`lg` are widths that only matter once the panel is centred.
 * `auto` hugs its content.
 */
export type DialogSize = 'auto' | 'sm' | 'md' | 'lg' | 'half' | 'full';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  placement?: DialogPlacement;
  size?: DialogSize;
  /** Optional control rendered left of the X (e.g. a settings gear). */
  headerAction?: ReactNode;
  /** An accessible name when there is no title. */
  label?: string;
  className?: string;
}

/* ── The stack: only the top dialog is live ─────────────────────────────── */

/**
 * Every open dialog, with the order it OPENED in.
 *
 * The order comes from render, not from an effect: React runs mount effects
 * child-first, so a dialog nested inside another registered before its
 * parent and the parent came out on top — Escape closed the wrong one.
 * Render is parent-first, always.
 */
const stack = new Map<symbol, number>();
let nextSeq = 1;
const listeners = new Set<() => void>();
function topOf(): symbol | undefined {
  let top: symbol | undefined;
  let best = -1;
  for (const [id, seq] of stack) {
    if (seq > best) {
      best = seq;
      top = id;
    }
  }
  return top;
}
function notify() {
  // The app behind a dialog is inert: not tabbable, not clickable, not read
  // out. The dialogs themselves are portaled beside the root, so this never
  // touches them.
  document.getElementById('root')?.toggleAttribute('inert', stack.size > 0);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Not `offsetParent`: it is null for everything inside a fixed overlay (and
// in jsdom), which emptied the trap. A hidden ancestor is what matters.
const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[hidden]') && el.getAttribute('aria-hidden') !== 'true'
  );

/**
 * THE modal for the whole app — one component, one behaviour.
 *
 * `Sheet` is this, pinned to the bottom, and every sheet in the app inherits
 * what this does: focus moves in and is trapped, and goes back where it came
 * from; the page behind is inert; Escape closes only the topmost dialog; the
 * panel animates out instead of vanishing; and the on-screen keyboard is
 * handled without mistaking a pinch-zoom for one.
 *
 * Keyboard handling: the panel stays ANCHORED to the screen bottom (its
 * surface fills all the way down, behind the keyboard), and only the scrolling
 * BODY gets extra bottom padding equal to the keyboard height — so the content
 * lifts above the keyboard while the background still reaches the bottom edge.
 *
 * Not the native <dialog>: `showModal()` fights exactly that keyboard
 * arithmetic on iOS, and its top layer cannot be told to sit under the toast.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  placement = 'bottom',
  size = 'full',
  headerAction,
  label,
  className,
}: DialogProps) {
  const id = useRef(Symbol('dialog')).current;
  // Assigned in render the moment it opens; see the stack above.
  const seq = useRef(0);
  if (open && seq.current === 0) seq.current = nextSeq++;
  if (!open) seq.current = 0;
  const titleId = useId();
  // Held in refs so an inline `onClose` from a caller can't re-arm the
  // listeners on every parent render — that churn was the old sheet's
  // most-reported "bug".
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Mounted while open — and for the exit animation after.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  // On-screen keyboard height (iOS visualViewport). 0 when closed/unsupported.
  const [kb, setKb] = useState(0);

  const top = useSyncExternalStore(subscribe, topOf, topOf);
  const isTop = top === id;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else {
      setClosing((was) => was || mounted);
    }
    // `mounted` is deliberately read, not depended on: this only reacts to
    // `open` turning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // What was on screen, kept for the exit animation: a sheet whose content
  // comes from a nullable selection used to empty out a frame before it
  // slid away.
  const lastRef = useRef({ children, title });
  if (open) lastRef.current = { children, title };

  // Focus in — once the panel exists. `mounted` is a render behind `open`,
  // so on the render where `open` turns true there is no panel yet to focus.
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      // The panel itself, not its first control: focusing a field would pop
      // the keyboard on a phone before anyone asked for it. Tab goes to the
      // first control from here.
      panel.focus({ preventScroll: true });
    }
  }, [open, mounted]);

  // On the stack while open — and focus back where it came from on the way
  // out, AFTER the pop has made the app behind live again: an element inside
  // an inert root refuses focus, so restoring first restored nothing.
  useEffect(() => {
    if (!open) return;
    stack.set(id, seq.current);
    notify();
    return () => {
      stack.delete(id);
      notify();
      // Read now, not when the effect ran: the panel did not exist yet then.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const panel = panelRef.current;
      const back = restoreRef.current;
      const active = document.activeElement;
      // Only if nobody moved it somewhere else meanwhile.
      if (back && (active === document.body || panel?.contains(active))) {
        back.focus?.({ preventScroll: true });
      }
    };
  }, [open, id]);

  // The keyboard, and only the keyboard: a pinch-zoom shrinks the visual
  // viewport too, and read as "a 500px keyboard" it pushed the whole sheet
  // body off the top of the screen.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return;
      if (vv.scale > 1.01) {
        setKb(0);
        return;
      }
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setKb(overlap > 80 ? overlap : 0);
    };
    sync();
    // The keyboard opens from a field's autoFocus DURING mount — its first
    // visualViewport `resize` can fire before this listener is attached, so
    // re-sync a few times right after open to catch that first one.
    const polls = [120, 320, 600, 900].map((d) => window.setTimeout(sync, d));
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    return () => {
      polls.forEach((t) => window.clearTimeout(t));
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      setKb(0);
    };
  }, [open]);

  // Escape closes the TOP dialog only — one keypress used to close every
  // sheet in a stack at once.
  useEffect(() => {
    if (!open || !isTop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isTop]);

  // Tab stays inside the panel.
  const trap = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = focusables(panelRef.current);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside =
      active &&
      active !== panelRef.current &&
      panelRef.current.contains(active);
    if (!inside) {
      // From the panel itself (where focus lands on open), or from outside.
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const finishClosing = () => {
    if (!closing) return;
    setClosing(false);
    setMounted(false);
  };

  // Belt for a browser that never fires animationend (reduced motion collapses
  // the animation to a fade, which still fires; this is for the ones that
  // skip it altogether).
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(finishClosing, 420);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  if (!mounted) return null;

  const shownTitle = closing ? lastRef.current.title : title;
  const shownChildren = closing ? lastRef.current.children : children;

  const bottom = placement === 'bottom';
  const center = placement === 'center';
  const auto = placement === 'auto';

  // Portal to <body> so the dialog is a true overlay even when the open
  // trigger lives inside a transformed ancestor (a `.curtain-reveal` route
  // would otherwise confine this fixed layer to the content box).
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        // The app behind is live again the moment it closes; the layer that
        // is only still here to animate out must not swallow the next tap.
        closing && 'pointer-events-none',
        bottom && 'items-end',
        center && 'items-center p-4',
        auto && 'items-end md:items-center md:p-6'
      )}
      // Anything beneath the top dialog is inert too.
      inert={!isTop && !closing}
      onKeyDown={trap}
    >
      {/* The veil. A div, not a button: it used to be a full-screen button and
          the first thing Tab landed on. */}
      <div
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
        className={cn(
          'absolute inset-0 bg-black/70',
          closing ? 'veil-out' : 'veil-in'
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={shownTitle ? titleId : undefined}
        aria-label={shownTitle ? undefined : label}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          // Children animate too, and animationend bubbles.
          if (e.target === e.currentTarget) finishClosing();
        }}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-x-hidden bg-surface-2 outline-none',
          closing ? 'curtain-exit' : 'curtain-reveal',
          // Phone: a sheet from the bottom, the app's own width.
          (bottom || auto) &&
            'max-w-app rounded-t-[1.75rem] border-t border-[rgba(228,195,106,0.3)] shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.7)]',
          (bottom || auto) &&
            (size === 'half' ? 'max-h-[64dvh]' : 'max-h-[94dvh]'),
          // Desk: a card in the middle, sized to what it holds.
          center && 'rounded-[1.75rem] shadow-loge',
          auto && 'md:rounded-[1.75rem] md:border-t-0 md:shadow-loge',
          (center || auto) && 'md:max-h-[86dvh]',
          (center || auto) && size === 'sm' && 'md:max-w-sm',
          (center || auto) &&
            (size === 'md' || size === 'half' || size === 'auto') &&
            'md:max-w-lg',
          (center || auto) && size === 'lg' && 'md:max-w-3xl',
          (center || auto) && size === 'full' && 'md:max-w-4xl',
          className
        )}
      >
        {/* Pinned header — grip + title + Close — never scrolls away. */}
        <div className="shrink-0 px-5 pt-3">
          <div
            className={cn(
              'mx-auto mb-3 h-1.5 w-10 rounded-full bg-fg/20',
              center && 'hidden',
              auto && 'md:hidden'
            )}
          />
          <div className="mb-3 flex items-center justify-between gap-3">
            {title ? (
              <h2
                id={titleId}
                className="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-fg"
              >
                {shownTitle}
              </h2>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-2">
              {headerAction}
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label="Close"
                className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface text-fg shadow-[inset_0_0_0_1px_rgba(228,195,106,0.3)] active:text-accent"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
        {/* The body scrolls; its bottom padding grows with the keyboard so the
            content clears it while the panel's surface still fills to the edge. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 transition-[padding] duration-200"
          style={{
            paddingBottom: kb
              ? `${kb + 20}px`
              : 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          {shownChildren}
        </div>
      </div>
    </div>,
    document.body
  );
}
