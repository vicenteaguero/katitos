import { Dialog, type DialogProps } from './dialog';

/**
 * The bottom sheet - `Dialog`, pinned to the bottom of the screen.
 *
 * Kept as its own name because fifty screens call it, and because on a phone
 * "a sheet from the bottom" is the right shape for almost everything. A
 * screen that also has to work on a desk asks `Dialog` for `placement="auto"`
 * instead and gets a centred card from a tablet up.
 */
export function Sheet(props: Omit<DialogProps, 'placement'>) {
  return <Dialog placement="bottom" {...props} />;
}
