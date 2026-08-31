import { memo, useState } from 'react';
import { ExternalLink, FileText, Play } from 'lucide-react';
import { cn } from '@kernel/lib';
import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { PlayButton } from '@kernel/ui';
import type { Block, Media, Lang, TableBlockData, Vocab } from '../types';
import { pick } from '../lib/pick';
import { parseInline } from '../lib/markdown';
import { VocabRow } from './kit';
import { youtubeId } from '../api/media';

/**
 * One piece of a lesson, whatever kind it is.
 *
 * Memoised: every keystroke in an answer box re-rendered every block on the
 * page, tables and all.
 */
export const BlockView = memo(function BlockView({
  block,
  support,
  target,
  vocab,
  media,
  onWord,
  clips,
}: {
  block: Block;
  support: Lang;
  /** The language the lesson teaches — the line that goes on top. */
  target: Lang;
  /** Words this block points at, already looked up. */
  vocab?: Vocab[];
  media?: Media;
  /** Given, every word of the headline can be tapped for its meaning. */
  onWord?: (word: string) => void;
  /**
   * Signed once for the whole lesson: a vocab block of thirty words used to
   * sign thirty URLs on its own. An empty string means "no clip to play".
   */
  clips?: Map<string, string>;
}) {
  switch (block.kind) {
    case 'divider':
      return <hr className="border-0 border-t border-fg/10" />;

    case 'vocab':
      return <VocabBlock words={vocab ?? []} support={support} clips={clips} />;

    case 'table':
      return (
        <TableBlock
          data={(block.data ?? {}) as TableBlockData}
          caption={pick(block, 'body', support)}
          support={support}
        />
      );

    case 'media':
      return media ? <MediaBlock media={media} /> : null;

    case 'text':
    default: {
      // The language being taught above, the explanation below — the shape
      // of a page in any textbook. The headline was hardwired to Russian, so
      // a Spanish lesson read in Russian showed the explanation as the
      // headline and never showed the Spanish at all.
      const head = block[`body_${target}`]?.trim() ?? '';
      const gloss = glossOf(block, support, target);
      if (!head && !gloss) return null;
      return (
        <div className="space-y-1">
          {head && (
            <p className="font-display text-lg leading-snug text-fg">
              <Rich text={head} onWord={onWord} />
            </p>
          )}
          {gloss && (
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">
              <Rich text={gloss} />
            </p>
          )}
        </div>
      );
    }
  }
});

/** A paragraph's **bold**, *italic* and ==highlight==, and nothing else. */
function Rich({
  text,
  onWord,
}: {
  text: string;
  onWord?: (word: string) => void;
}) {
  const inner = (s: string) =>
    onWord ? <Words text={s} onWord={onWord} /> : s;
  return (
    <>
      {parseInline(text).map((t, i) => {
        if (t.kind === 'bold') return <strong key={i}>{inner(t.text)}</strong>;
        if (t.kind === 'italic') return <em key={i}>{inner(t.text)}</em>;
        if (t.kind === 'mark')
          return (
            <mark key={i} className="rounded bg-gold/25 px-0.5 text-fg">
              {inner(t.text)}
            </mark>
          );
        return <span key={i}>{inner(t.text)}</span>;
      })}
    </>
  );
}

/** Every word a button, set exactly like the text — a tap asks what it means. */
function Words({
  text,
  onWord,
}: {
  text: string;
  onWord: (word: string) => void;
}) {
  // Odd parts are the words; even parts the space and punctuation between.
  const parts = text.split(/(\p{L}[\p{L}\p{M}'’-]*)/u);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <button
            key={i}
            type="button"
            className="glossary-word"
            onClick={() => onWord(part)}
          >
            {part}
          </button>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * The explanation of a block, in the reader's language or the next best —
 * never in the language being taught, which is the headline's job.
 */
function glossOf(block: Block, support: Lang, target: Lang): string {
  const order: Lang[] = [support, 'en', 'es', 'ru'];
  for (const lang of order) {
    if (lang === target) continue;
    const value = block[`body_${lang}`];
    if (value && value.trim()) return value;
  }
  return '';
}

/**
 * The endings, in a grid.
 *
 * Scrolls sideways inside itself rather than pushing the page wide — six cases
 * will not fit across a phone, and a lesson you have to pan horizontally to
 * read is worse than one you swipe a table in.
 */
function TableBlock({
  data,
  caption,
  support,
}: {
  data: TableBlockData;
  caption: string;
  support: Lang;
}) {
  const headings = data.headings ?? [];
  const rows = data.rows ?? [];
  if (!rows.length) return null;

  // The reader's language first, then the next best — a display may fall
  // back where an editor must not.
  const label = (h: { ru?: string; en?: string; es?: string }) =>
    h[support] || h.en || h.es || h.ru || '';

  return (
    <figure className="m-0 space-y-1">
      {caption && (
        <figcaption className="font-sans text-xs text-muted">
          {caption}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-lg bg-surface">
        <table className="w-full border-collapse text-left">
          {headings.length > 0 && (
            <thead>
              <tr>
                {headings.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="whitespace-nowrap px-2.5 py-1.5 font-sans text-[0.62rem] uppercase tracking-[0.12em] text-gold"
                  >
                    {label(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-fg/5">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      'whitespace-nowrap px-2.5 py-1.5 font-display text-[0.95rem]',
                      // The first column is the label of the row (the case, the
                      // person); the rest are the forms being taught.
                      c === 0 ? 'text-muted' : 'text-fg'
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function VocabBlock({
  words,
  support,
  clips,
}: {
  words: Vocab[];
  support: Lang;
  clips?: Map<string, string>;
}) {
  if (!words.length) return null;
  return (
    <ul className="divide-y divide-fg/5 rounded-lg bg-surface px-3">
      {words.map((w) => (
        <VocabRow
          key={w.id}
          word={w}
          support={support}
          url={
            clips && w.audio_path ? (clips.get(w.audio_path) ?? '') : undefined
          }
        />
      ))}
    </ul>
  );
}

function MediaBlock({ media }: { media: Media }) {
  if (media.kind === 'youtube' && media.url) return <YouTube media={media} />;
  if (media.kind === 'image' && media.storage_path)
    return <StoredImage path={media.storage_path} title={media.title} />;
  // A recording she attached should play here, not open in another app.
  if (media.kind === 'audio' && media.storage_path) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2">
        <PlayButton
          bucket={BUCKETS.languageMedia}
          path={media.storage_path}
          size="sm"
        />
        <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
          {media.title ?? 'Listen'}
        </span>
      </div>
    );
  }
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
        crossOrigin="anonymous"
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
      crossOrigin="anonymous"
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
