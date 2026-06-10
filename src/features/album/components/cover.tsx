import { BookOpen } from 'lucide-react';
import type { AlbumProgress } from '../lib/progression';

export function Cover({ progress }: { progress?: AlbumProgress }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg bg-gradient-to-br from-rose-200 to-amber-100 p-6 text-center text-rose-950">
      <BookOpen size={48} />
      <div>
        <h1 className="text-2xl font-black tracking-tight">Pololini Album</h1>
        <p className="mt-1 text-sm opacity-80">
          Our life, one sticker at a time
        </p>
      </div>
      {progress && (
        <p className="text-xs font-semibold opacity-70">
          {progress.filled}/{progress.total} stickers · {progress.foilsFilled}/
          {progress.foilsTotal} foils
        </p>
      )}
    </div>
  );
}
