import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { Card, CardTitle } from '@kernel/ui';
import { useAlbumPhotoCounts, useAlbums } from '../api/photo-book.queries';

/** The shelf in miniature: how many books, how many photos, the newest cover. */
export function AlbumWidget() {
  const { data: books } = useAlbums();
  const { data: counts } = useAlbumPhotoCounts();
  const covers = (books ?? []).map((b) => b.cover_path).filter(Boolean);
  const { data: urls } = useSignedUrls(BUCKETS.album, covers, { proxy: true });

  const total = books?.length ?? 0;
  const photos = counts
    ? [...counts.values()].reduce((sum, n) => sum + n, 0)
    : null;
  const newest = (books ?? []).find((b) => b.cover_path);
  const cover = newest?.cover_path ? urls?.get(newest.cover_path) : undefined;

  return (
    <Link to="/album">
      <Card className="h-full">
        <CardTitle>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> Albums
          </span>
        </CardTitle>
        <p className="mt-1 text-sm font-semibold tabular-nums text-fg">
          {total} {total === 1 ? 'book' : 'books'}
          {photos != null && ` · ${photos} photos`}
        </p>
        {cover && (
          <img
            src={cover}
            alt=""
            className="mt-2 aspect-square w-full rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </Card>
    </Link>
  );
}
