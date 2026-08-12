import { useParams } from 'react-router';
import { PhotoBook3D } from '../components/photo-book/photo-book-3d';

/**
 * One album, open. The id comes from the shelf; the two legacy books
 * (Pololini, Summer Panini) resolve by scope elsewhere and land on the same
 * engine.
 */
export function AlbumRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  if (!bookId) return <PhotoBook3D scope="life" title="Pololini" />;
  return <PhotoBook3D bookId={bookId} />;
}
