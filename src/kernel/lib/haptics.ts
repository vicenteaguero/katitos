/**
 * The little buzz under a tap.
 *
 * Two patterns, one place. The streak's habit circle and the Five's goal rows
 * had the same two arrays copy-pasted between them, which is how "on" ends up
 * feeling different in two parts of one app.
 *
 * Silent wherever the browser has no vibrator, which is every desktop and every
 * iPhone - `navigator.vibrate` is simply absent there, so the optional call is
 * the whole guard.
 */
export function tap(kind: 'on' | 'off' = 'on'): void {
  navigator.vibrate?.(kind === 'on' ? [0, 26] : [0, 12]);
}
