import { PhotoBook3D } from '../components/photo-book/photo-book-3d';

/**
 * Pololini — our life-long photo book. The old sticker-slot album has been
 * replaced by the shared 3D book engine (the same one powers Summer Panini per
 * trip). Sticker tables/queries stay in place for the progress widget.
 */
export function AlbumRoute() {
  return <PhotoBook3D scope="life" title="Pololini" />;
}
