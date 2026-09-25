/**
 * The shell's way of asking whether the Five is hers yet.
 *
 * The answer lives with the feature (and so does the reasoning), because the
 * route uses it too; this re-export exists so the drawer and Home do not reach
 * past a feature's barrel to get it.
 */
export { useFiveVisible } from '@features/five';
