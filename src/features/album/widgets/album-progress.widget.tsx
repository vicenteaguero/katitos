import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useAlbumProgress, useAlbumStickers } from '../api/album.queries';
import { AlbumStickerImage } from '../components/album-sticker-image';

export function AlbumWidget() {
  const progress = useAlbumProgress();
  const { data: stickers } = useAlbumStickers();

  // Newest sticker (by created_at) for a little peek.
  const newest = (stickers?.rows ?? [])
    .filter((s) => s.image_path)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <Link to="/album">
      <Card className="h-full">
        <CardTitle>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> Album
          </span>
        </CardTitle>
        {progress ? (
          <>
            <p className="mt-1 text-sm font-semibold text-fg tabular-nums">
              {progress.filled}/{progress.total} stickers
            </p>
            <div className="bg-brown/40 mt-1 h-1.5 w-full overflow-hidden">
              <div
                className="bg-gold h-full"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Loading…</p>
        )}
        {newest && (
          <AlbumStickerImage
            path={newest.image_path}
            className="gilt-hairline-flat mt-2 aspect-square w-full object-cover"
          />
        )}
      </Card>
    </Link>
  );
}
