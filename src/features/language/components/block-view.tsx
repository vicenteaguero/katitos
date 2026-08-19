import { useState } from 'react';
import { ExternalLink, FileText, Play } from 'lucide-react';
import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { PlayButton } from '@kernel/ui';
import type { Block, Media, SupportLang, Vocab } from '../types';
import { meaningOf, pick } from '../lib/pick';
import { youtubeId } from '../api/media';

/** One piece of a lesson, whatever kind it is. */
export function BlockView({
  block,
  support,
  vocab,
  media,
}: {
  block: Block;
  support: SupportLang;
  /** Words this block points at, already looked up. */
  vocab?: Vocab[];
  media?: Media;
}) {
  switch (block.kind) {
    case 'divider':
      return <hr className="border-0 border-t border-fg/10" />;

    case 'vocab':
      return <VocabBlock words={vocab ?? []} support={support} />;

    case 'media':
      return media ? <MediaBlock media={media} /> : null;

    case 'text':
    default: {
      const body = pick(block, 'body', support);
      if (!body) return null;
      return (
        <div className="space-y-1">
          {/* The Russian above, the explanation below — the shape of a page in
              any textbook, and it survives the language switch untouched. */}
          {block.body_ru && support !== 'en' && block.body_ru !== body && (
            <p className="font-display text-lg leading-snug text-fg">
              {block.body_ru}
            </p>
          )}
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">
            {body}
          </p>
        </div>
      );
    }
  }
}

function VocabBlock({
  words,
  support,
}: {
  words: Vocab[];
  support: SupportLang;
}) {
  if (!words.length) return null;
  return (
    <ul className="divide-y divide-fg/5 rounded-lg bg-surface px-3">
      {words.map((w) => (
        <li key={w.id} className="flex items-center gap-2 py-2">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base text-fg">
              {w.ru}
              {w.transliteration && (
                <span className="ml-2 font-sans text-[0.68rem] text-muted">
                  {w.transliteration}
                </span>
              )}
            </span>
            <span className="block truncate font-sans text-xs text-muted">
              {meaningOf(w, support)}
            </span>
          </span>
          {w.audio_path && (
            <PlayButton
              bucket={BUCKETS.languageAudio}
              path={w.audio_path}
              size="sm"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function MediaBlock({ media }: { media: Media }) {
  if (media.kind === 'youtube' && media.url) return <YouTube media={media} />;
  if (media.kind === 'image' && media.storage_path)
    return <StoredImage path={media.storage_path} title={media.title} />;
  return <FileCard media={media} />;
}

/**
 * A video that costs nothing until it is watched.
 *
 * The still frame is an image; the player is an iframe that loads a megabyte
 * of YouTube. A lesson with five videos would take seconds to open if all five
 * players mounted, so none of them do until somebody taps one.
 */
function YouTube({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(media.url ?? '');
  if (!id) return <FileCard media={media} />;

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={media.title ?? 'Video'}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="lift-press relative block aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <img
        src={media.poster_path ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt={media.title ?? ''}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white">
          <Play className="h-5 w-5 translate-x-[1px]" />
        </span>
      </span>
    </button>
  );
}

function StoredImage({ path, title }: { path: string; title: string | null }) {
  const { data: url } = useSignedUrl(BUCKETS.languageMedia, path);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title ?? ''}
      className="w-full rounded-lg"
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * A worksheet, opened outside the app.
 *
 * Deliberately not an inline `<iframe>` viewer: PDFs in an iframe are
 * unreliable in an installed iOS app, and half-rendering a worksheet is worse
 * than handing it to the system viewer that works.
 */
function FileCard({ media }: { media: Media }) {
  const { data: signed } = useSignedUrl(
    BUCKETS.languageMedia,
    media.storage_path ?? undefined
  );
  const href = media.url ?? signed;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="lift-press flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5"
    >
      <FileText className="h-4 w-4 shrink-0 text-gold" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
        {media.title ?? media.kind}
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
    </a>
  );
}
