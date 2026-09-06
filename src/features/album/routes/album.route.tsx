import { Link, useParams } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Button, Empty } from '@kernel/ui';
import { PhotoBook3D } from '../components/photo-book/photo-book-3d';

/**
 * One album, open.
 *
 * Every book is opened by id from the shelf. There is no id-less fallback any
 * more: it used to resolve a singleton "life" book, which was never something
 * anyone asked for - the shelf holds as many albums as we want, and that is
 * enough.
 */
export function AlbumRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  if (!bookId) {
    return (
      <Empty
        icon={<BookOpen />}
        title="No album here"
        hint="Pick one off the shelf."
        action={
          <Link to="/album">
            <Button>Back to the shelf</Button>
          </Link>
        }
      />
    );
  }
  return <PhotoBook3D bookId={bookId} />;
}
