import { useEffect, useRef } from 'react';

type Handler = (e: KeyboardEvent) => void;

/**
 * Keyboard shortcuts for a screen: `{ 'mod+s': save, 'j': next, 'escape': close }`.
 *
 * `mod` is ⌘ on a Mac and Ctrl elsewhere. A plain letter never fires while
 * something is being typed - a "j" in a text box is a letter, not "next" -
 * but a modified combo does, so ⌘↵ submits from inside the field.
 * Handlers are read through a ref, so inline arrows are fine.
 */
export function useHotkeys(
  bindings: Record<string, Handler>,
  { enabled = true }: { enabled?: boolean } = {}
): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const pressed = e.key === ' ' ? 'space' : e.key.toLowerCase();
      // Space and Enter on a focused control ARE that control's activation.
      const activating =
        (pressed === 'space' || pressed === 'enter') &&
        !!target?.closest('button,[role="button"],a[href],summary');

      for (const [combo, handler] of Object.entries(ref.current)) {
        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const mod = parts.includes('mod');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        if (mod !== (e.metaKey || e.ctrlKey)) continue;
        if (shift !== e.shiftKey || alt !== e.altKey) continue;
        if (pressed !== key) continue;
        if ((typing || activating) && !mod && !alt && key !== 'escape')
          continue;
        e.preventDefault();
        handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
