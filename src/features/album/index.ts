export { albumFeature } from './feature';

/**
 * Neither the book engine NOR the shelf widget is re-exported here.
 *
 * This barrel is imported by the feature registry, which every launch loads —
 * so anything re-exported from it lands in the boot chunk. Re-exporting the
 * engine dragged react-pageflip and the whole 3D book into the bundle the home
 * screen parses, for a screen most launches never open. The two places that
 * need it import the module directly.
 */
export type { PhotoBook3DProps } from './components/photo-book/photo-book-3d';
